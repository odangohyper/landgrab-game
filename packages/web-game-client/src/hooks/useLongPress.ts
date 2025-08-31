import { useCallback, useRef } from 'react';

interface LongPressOptions {
  shouldPreventDefault?: boolean;
  delay?: number;
}

const useLongPress = (
  onLongPress: (event: React.MouseEvent | React.TouchEvent) => void,
  onClick: (event: React.MouseEvent | React.TouchEvent) => void,
  { shouldPreventDefault = true, delay = 700 }: LongPressOptions = {}
) => {
  const timeout = useRef<NodeJS.Timeout>();
  const target = useRef<EventTarget>();

  const start = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      // Prevent ghost click on mobile
      if (shouldPreventDefault && event.target) {
        event.target.addEventListener('touchend', preventDefault, { passive: false });
        target.current = event.target;
      }
      timeout.current = setTimeout(() => {
        onLongPress(event);
      }, delay);
    },
    [onLongPress, delay, shouldPreventDefault]
  );

  const clear = useCallback(
    (event: React.MouseEvent | React.TouchEvent, shouldTriggerClick = true) => {
      timeout.current && clearTimeout(timeout.current);
      if (shouldTriggerClick) {
        onClick(event);
      }
      if (shouldPreventDefault && target.current) {
        target.current.removeEventListener('touchend', preventDefault);
      }
    },
    [shouldPreventDefault, onClick]
  );

  const preventDefault = (event: Event) => {
      if (!('touches' in event) || event.touches.length < 2) {
          event.preventDefault();
      }
  };

  return {
    onMouseDown: (e: React.MouseEvent) => start(e),
    onTouchStart: (e: React.TouchEvent) => start(e),
    onMouseUp: (e: React.MouseEvent) => clear(e),
    onMouseLeave: (e: React.MouseEvent) => clear(e, false),
    onTouchEnd: (e: React.TouchEvent) => clear(e),
  };
};

export default useLongPress;
