import { CardState, SavedCard, PrintCalibration } from '../types';

const STORAGE_KEYS = {
  SAVED_DESIGNS: 'smartid_saved_designs_v1',
  CALIBRATION: 'smartid_print_calibration_v1',
  CURRENT_DRAFT: 'smartid_current_draft_v1',
};

export const DEFAULT_CALIBRATION: PrintCalibration = {
  offsetX: 0,
  offsetY: 0,
  scale: 135,
  a4CardsPerPage: 8,
  a4Spacing: 6,
  a4Margin: 10,
  printMode: 'cr80',
  cardSide: 'both',
  copies: 1,
};

// In-memory fallback if localStorage is disabled or restricted in iframe
let inMemorySavedDesigns: SavedCard[] = [];
let inMemoryDraft: CardState | null = null;
let inMemoryCalibration: PrintCalibration = { ...DEFAULT_CALIBRATION };

export function sanitizeCardState(card: CardState): CardState {
  if (!card || !card.details) return card;
  if (Array.isArray(card.details.customFields)) {
    card.details.customFields = card.details.customFields.filter((cf) => {
      const label = (cf.label || '').toLowerCase();
      const val = (cf.value || '').toLowerCase();
      return (
        !label.includes('floor') &&
        !label.includes('zone') &&
        !label.includes('access level') &&
        !val.includes('floor') &&
        !val.includes('zone')
      );
    });
  }
  return card;
}

export function getSavedDesigns(): SavedCard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SAVED_DESIGNS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemorySavedDesigns = parsed.map((sc) => ({
          ...sc,
          cardState: sanitizeCardState(sc.cardState),
        }));
        return inMemorySavedDesigns;
      }
    }
  } catch (e) {
    console.warn('Could not read from localStorage, using in-memory store:', e);
  }
  return inMemorySavedDesigns.map((sc) => ({
    ...sc,
    cardState: sanitizeCardState(sc.cardState),
  }));
}

/**
 * Loads designs from persistent server storage and synchronizes with local storage.
 */
export async function fetchSavedDesignsFromServer(): Promise<SavedCard[]> {
  try {
    const res = await fetch('/api/designs');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.designs)) {
        const sanitized: SavedCard[] = data.designs.map((sc: any) => ({
          ...sc,
          cardState: sanitizeCardState(sc.cardState),
        }));
        inMemorySavedDesigns = sanitized;
        try {
          localStorage.setItem(STORAGE_KEYS.SAVED_DESIGNS, JSON.stringify(sanitized));
        } catch {}
        return sanitized;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch designs from server:', err);
  }
  return getSavedDesigns();
}

export function saveDesign(
  cardState: CardState,
  customName?: string,
  existingId?: string,
  thumbnail?: string
): { success: boolean; card: SavedCard; error?: string } {
  const designs = getSavedDesigns();
  const id = existingId || ('card_' + Date.now());
  const now = new Date().toISOString();

  const cardTitle = customName?.trim() || 
    (cardState.details.fullName ? `${cardState.details.fullName} (${cardState.details.uniqueId || 'ID'})` : 'Untitled ID Card');

  const newCard: SavedCard = {
    id,
    savedAt: now,
    name: cardTitle,
    personName: cardState.details.fullName || 'Cardholder',
    uniqueId: cardState.details.uniqueId || '',
    templateName: cardState.customTemplateName || cardState.templateId || 'Custom',
    thumbnail,
    cardState: JSON.parse(JSON.stringify(sanitizeCardState(cardState))), // deep clone & sanitize
  };

  let updatedList: SavedCard[];
  const existingIdx = designs.findIndex((d) => d.id === id);
  if (existingIdx >= 0) {
    // Update existing card
    updatedList = [...designs];
    updatedList[existingIdx] = newCard;
  } else {
    // Add to top of list
    updatedList = [newCard, ...designs];
  }

  inMemorySavedDesigns = updatedList;

  // Persist to server API asynchronously
  try {
    fetch('/api/designs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card: newCard }),
    }).catch((serverErr) => {
      console.warn('Failed to persist design to server:', serverErr);
    });
  } catch (e) {
    // Ignore network error in offline mode
  }

  // Attempt to write to localStorage with quota-safe fallbacks
  try {
    localStorage.setItem(STORAGE_KEYS.SAVED_DESIGNS, JSON.stringify(updatedList));
    return { success: true, card: newCard };
  } catch (e: any) {
    console.warn('LocalStorage quota warning, trying lightweight save:', e);
    try {
      // Strip thumbnails from other designs
      const lightweight = updatedList.map((c) => ({
        ...c,
        thumbnail: c.id === id ? c.thumbnail : undefined,
      }));
      localStorage.setItem(STORAGE_KEYS.SAVED_DESIGNS, JSON.stringify(lightweight));
      return { success: true, card: newCard };
    } catch (err2: any) {
      console.warn('LocalStorage full, saved to server and session RAM:', err2);
      return { 
        success: true, 
        card: newCard, 
      };
    }
  }
}

export function deleteSavedDesign(id: string): boolean {
  const designs = getSavedDesigns();
  const filtered = designs.filter((d) => d.id !== id);
  inMemorySavedDesigns = filtered;
  
  try {
    fetch(`/api/designs/${id}`, { method: 'DELETE' }).catch(() => {});
  } catch {}

  try {
    localStorage.setItem(STORAGE_KEYS.SAVED_DESIGNS, JSON.stringify(filtered));
    return true;
  } catch (e) {
    console.error('Failed to delete saved design from localStorage:', e);
    return false;
  }
}

export function duplicateSavedDesign(id: string): SavedCard | null {
  const designs = getSavedDesigns();
  const original = designs.find((d) => d.id === id);
  if (!original) return null;

  const duplicated: SavedCard = {
    ...JSON.parse(JSON.stringify(original)),
    id: 'card_' + Date.now(),
    savedAt: new Date().toISOString(),
    name: `${original.name} (Copy)`,
  };

  const updated = [duplicated, ...designs];
  inMemorySavedDesigns = updated;

  try {
    fetch(`/api/designs/duplicate/${id}`, { method: 'POST' }).catch(() => {});
  } catch {}

  try {
    localStorage.setItem(STORAGE_KEYS.SAVED_DESIGNS, JSON.stringify(updated));
  } catch (e) {
    console.warn('Storage warning during duplicate:', e);
  }
  return duplicated;
}

/**
 * Stores card state as current active print target
 */
export function setPrintTarget(card: CardState): void {
  try {
    localStorage.setItem('smartid_print_target', JSON.stringify(card));
  } catch {}
  try {
    fetch('/api/credentials/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'current_print', cardState: card }),
    }).catch(() => {});
  } catch {}
}

// ==========================================
// Draft Persistence
// ==========================================

export function saveCurrentDraft(cardState: CardState): void {
  inMemoryDraft = cardState;
  try {
    localStorage.setItem(STORAGE_KEYS.CURRENT_DRAFT, JSON.stringify(cardState));
  } catch (e) {
    // Silently continue if quota warning
  }
}

export function getCurrentDraft(): CardState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_DRAFT);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.details) {
        return sanitizeCardState(parsed);
      }
    }
  } catch (e) {
    console.warn('Could not read current draft:', e);
  }
  return inMemoryDraft ? sanitizeCardState(inMemoryDraft) : null;
}

export function clearCurrentDraft(): void {
  inMemoryDraft = null;
  try {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_DRAFT);
  } catch {
    // Ignore
  }
}

// ==========================================
// Print Calibration Persistence
// ==========================================

export function getPrintCalibration(): PrintCalibration {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CALIBRATION);
    if (raw) {
      const parsed = JSON.parse(raw);
      inMemoryCalibration = { ...DEFAULT_CALIBRATION, ...parsed };
      return inMemoryCalibration;
    }
  } catch {
    // Ignore
  }
  return inMemoryCalibration;
}

export function savePrintCalibration(calibration: PrintCalibration): void {
  inMemoryCalibration = { ...calibration };
  try {
    localStorage.setItem(STORAGE_KEYS.CALIBRATION, JSON.stringify(calibration));
  } catch (e) {
    console.error('Failed to save print calibration:', e);
  }
}
