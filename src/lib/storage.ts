import { AppState } from './types';

const KEY = 'toetsen-nakijker-state';

export function saveState(state: AppState) {
  try {
    // Don't save large base64 images to localStorage (too big)
    // Save only the structured data
    const lightweight = {
      ...state,
      examFileData: state.examFileData ? '[file]' : null,
      answerKeyData: state.answerKeyData ? '[file]' : null,
      pages: state.pages.map(p => ({ ...p, dataUrl: '[file]' })),
    };
    localStorage.setItem(KEY, JSON.stringify(lightweight));
  } catch (e) {
    console.warn('Could not save state to localStorage', e);
  }
}

export function clearState() {
  try {
    localStorage.removeItem(KEY);
  } catch (e) {}
}
