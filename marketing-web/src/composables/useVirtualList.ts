import { computed, ref } from 'vue'

export interface VirtualRow {
  height: number
}

export interface VirtualItem<T> {
  row: T
  offset: number
}

/** 返回第一个 offsets[i] > target 的下标（lower_bound） */
function lowerBound(offsets: number[], target: number): number {
  let lo = 0
  let hi = offsets.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (offsets[mid] <= target) lo = mid + 1
    else hi = mid
  }
  return lo
}

/**
 * 自定义虚拟滚动：只渲染可视区附近的行，支持变高行。
 * 每行必须显式声明 height，内部用前缀和精确计算偏移。
 */
export function useVirtualList<T extends VirtualRow>(
  getRows: () => T[],
  getViewportHeight: () => number,
  buffer = 5,
) {
  const scrollTop = ref(0)

  const offsets = computed(() => {
    const list = getRows()
    const arr = new Array<number>(list.length)
    let acc = 0
    for (let i = 0; i < list.length; i++) {
      arr[i] = acc
      acc += list[i].height
    }
    return arr
  })

  const totalHeight = computed(() => {
    const list = getRows()
    return list.length
      ? offsets.value[list.length - 1] + list[list.length - 1].height
      : 0
  })

  const visible = computed<VirtualItem<T>[]>(() => {
    const list = getRows()
    const arr = offsets.value
    if (!list.length) return []
    const start = Math.max(0, lowerBound(arr, scrollTop.value) - 1 - buffer)
    const end = Math.min(
      list.length,
      lowerBound(arr, scrollTop.value + getViewportHeight()) + buffer,
    )
    const result = new Array<VirtualItem<T>>(Math.max(0, end - start))
    for (let i = start; i < end; i++) {
      result[i - start] = { row: list[i], offset: arr[i] }
    }
    return result
  })

  const onScroll = (e: Event) => {
    scrollTop.value = (e.target as HTMLElement).scrollTop
  }

  return { onScroll, visible, totalHeight }
}
