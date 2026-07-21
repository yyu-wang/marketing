import { ref, onBeforeUnmount } from 'vue'

const MOBILE_MAX = 767
const TABLET_MAX = 1023

export function useDevice() {
  const mqMobile = window.matchMedia(`(max-width: ${MOBILE_MAX}px)`)
  const mqTablet = window.matchMedia(
    `(min-width: ${MOBILE_MAX + 1}px) and (max-width: ${TABLET_MAX}px)`,
  )

  const isMobile = ref(mqMobile.matches)
  const isTablet = ref(mqTablet.matches)

  const onMobileChange = (e: MediaQueryListEvent) => {
    isMobile.value = e.matches
  }
  const onTabletChange = (e: MediaQueryListEvent) => {
    isTablet.value = e.matches
  }

  mqMobile.addEventListener('change', onMobileChange)
  mqTablet.addEventListener('change', onTabletChange)

  onBeforeUnmount(() => {
    mqMobile.removeEventListener('change', onMobileChange)
    mqTablet.removeEventListener('change', onTabletChange)
  })

  return { isMobile, isTablet }
}
