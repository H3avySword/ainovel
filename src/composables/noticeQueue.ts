import { onUnmounted, ref } from 'vue';
import type { NoticeItem, NoticeType } from '../types';

export const useNoticeQueue = () => {
  const notices = ref<NoticeItem[]>([]);
  const noticeTimers = new Map<number, ReturnType<typeof setTimeout>>();

  const dismissNotice = (id: number) => {
    const timer = noticeTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      noticeTimers.delete(id);
    }
    notices.value = notices.value.filter((notice) => notice.id !== id);
  };

  const openNotice = (
    type: NoticeType,
    title: string,
    message?: string,
    duration = 2600
  ) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    notices.value.push({ id, type, title, message });
    const timer = setTimeout(() => {
      dismissNotice(id);
    }, duration);
    noticeTimers.set(id, timer);
  };

  const clearNotices = () => {
    noticeTimers.forEach((timer) => clearTimeout(timer));
    noticeTimers.clear();
    notices.value = [];
  };

  onUnmounted(() => {
    clearNotices();
  });

  return {
    notices,
    openNotice,
    dismissNotice,
    clearNotices
  };
};
