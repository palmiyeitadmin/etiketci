import { useRef } from "react";

/**
 * A ref that always holds the latest value. Effects that should run only when their real inputs change
 * (an id, a flag) can still call the newest version of a callback or read the current language's texts
 * through it, without listing those as dependencies.
 */
export function useLatest<T>(value: T) {
    const ref = useRef(value);
    ref.current = value;
    return ref;
}
