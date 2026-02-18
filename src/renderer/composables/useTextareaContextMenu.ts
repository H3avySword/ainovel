import { computed, reactive, ref } from 'vue';

export type TextareaMenuIcon = 'cut' | 'copy' | 'paste' | 'select-all' | 'polish';
export type TextareaMenuVariant = 'default' | 'polish';

export type TextareaMenuItem = {
  id: 'cut' | 'copy' | 'paste' | 'select-all' | 'polish';
  label: string;
  icon: TextareaMenuIcon;
  disabled: boolean;
  variant?: TextareaMenuVariant;
};

type OpenOptions = {
  showPolish?: boolean;
  supportsPolish?: boolean;
  onPolish?: (textarea: HTMLTextAreaElement) => void;
};

type MenuState = {
  isOpen: boolean;
  x: number;
  y: number;
  target: HTMLTextAreaElement | null;
};

const dispatchInput = (textarea: HTMLTextAreaElement) => {
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
};

const getSelectedText = (textarea: HTMLTextAreaElement) => {
  const start = Math.max(0, textarea.selectionStart ?? 0);
  const end = Math.max(start, textarea.selectionEnd ?? start);
  return textarea.value.slice(start, end);
};

const getElectronClipboard = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  return (window as any)?.electronAPI?.clipboard ?? null;
};

const readClipboardText = async () => {
  try {
    const electronClipboard = getElectronClipboard();
    if (electronClipboard?.readText) {
      const text = await electronClipboard.readText();
      return typeof text === 'string' ? text : '';
    }
  } catch {
    // Fallback below.
  }

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
      return await navigator.clipboard.readText();
    }
  } catch {
    // Ignore clipboard read failure.
  }

  return '';
};

const writeClipboardText = async (text: string) => {
  try {
    const electronClipboard = getElectronClipboard();
    if (electronClipboard?.writeText) {
      await electronClipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback below.
  }

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Ignore clipboard write failure.
  }

  return false;
};

const replaceSelection = (textarea: HTMLTextAreaElement, replacement: string) => {
  const start = Math.max(0, textarea.selectionStart ?? 0);
  const end = Math.max(start, textarea.selectionEnd ?? start);
  const before = textarea.value.slice(0, start);
  const after = textarea.value.slice(end);
  textarea.value = `${before}${replacement}${after}`;
  const nextCursor = start + replacement.length;
  textarea.setSelectionRange(nextCursor, nextCursor);
  dispatchInput(textarea);
};

export const useTextareaContextMenu = () => {
  const menuState = reactive<MenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    target: null,
  });

  const selectionStart = ref(0);
  const selectionEnd = ref(0);
  const supportsPolish = ref(false);
  const showPolish = ref(false);
  const canPaste = ref(true);
  const polishHandler = ref<((textarea: HTMLTextAreaElement) => void) | null>(null);

  const syncSelection = () => {
    const textarea = menuState.target;
    if (!textarea) {
      selectionStart.value = 0;
      selectionEnd.value = 0;
      return;
    }
    selectionStart.value = Math.max(0, textarea.selectionStart ?? 0);
    selectionEnd.value = Math.max(selectionStart.value, textarea.selectionEnd ?? selectionStart.value);
  };

  const refreshClipboardState = async () => {
    const text = await readClipboardText();
    canPaste.value = text.length > 0;
  };

  const closeMenu = () => {
    menuState.isOpen = false;
    menuState.target = null;
    selectionStart.value = 0;
    selectionEnd.value = 0;
    supportsPolish.value = false;
    showPolish.value = false;
    polishHandler.value = null;
  };

  const openFromEvent = (
    event: MouseEvent,
    targetTextarea: HTMLTextAreaElement,
    options: OpenOptions = {}
  ) => {
    event.preventDefault();
    event.stopPropagation();

    menuState.target = targetTextarea;
    menuState.x = event.clientX;
    menuState.y = event.clientY;
    menuState.isOpen = true;
    supportsPolish.value = !!options.supportsPolish;
    showPolish.value = !!options.showPolish;
    polishHandler.value = options.onPolish ?? null;
    syncSelection();
    void refreshClipboardState();
  };

  const hasSelection = computed(() => selectionEnd.value > selectionStart.value);

  const menuItems = computed<TextareaMenuItem[]>(() => {
    const items: TextareaMenuItem[] = [
      {
        id: 'cut',
        label: '\u526a\u5207',
        icon: 'cut',
        disabled: !hasSelection.value,
      },
      {
        id: 'copy',
        label: '\u590d\u5236',
        icon: 'copy',
        disabled: !hasSelection.value,
      },
      {
        id: 'paste',
        label: '\u7c98\u8d34',
        icon: 'paste',
        disabled: !canPaste.value,
      },
      {
        id: 'select-all',
        label: '\u5168\u9009',
        icon: 'select-all',
        disabled: false,
      },
    ];

    if (showPolish.value) {
      items.push({
        id: 'polish',
        label: 'AI \u6da6\u8272',
        icon: 'polish',
        disabled: !supportsPolish.value || !hasSelection.value,
        variant: 'polish',
      });
    }

    return items;
  });

  const runAction = async (actionId: TextareaMenuItem['id']) => {
    const textarea = menuState.target;
    if (!textarea) {
      closeMenu();
      return;
    }

    textarea.focus();
    syncSelection();
    const selectedText = getSelectedText(textarea);

    switch (actionId) {
      case 'cut': {
        if (!selectedText) break;
        const copied = await writeClipboardText(selectedText);
        if (!copied) break;
        replaceSelection(textarea, '');
        break;
      }
      case 'copy': {
        if (!selectedText) break;
        await writeClipboardText(selectedText);
        break;
      }
      case 'paste': {
        const text = await readClipboardText();
        if (!text) break;
        replaceSelection(textarea, text);
        break;
      }
      case 'select-all': {
        textarea.setSelectionRange(0, textarea.value.length);
        syncSelection();
        closeMenu();
        return;
      }
      case 'polish': {
        if (!selectedText || !supportsPolish.value || !polishHandler.value) break;
        polishHandler.value(textarea);
        break;
      }
      default:
        break;
    }

    closeMenu();
  };

  return {
    menuState,
    menuItems,
    openFromEvent,
    closeMenu,
    runAction,
  };
};
