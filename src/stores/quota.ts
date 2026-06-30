import { defineStore } from 'pinia'
import { getTodayQuota } from '@/api/quota'
import type { Quota } from '@/types/quota'

interface QuotaState extends Quota {
  loading: boolean
  loaded: boolean
}

export const useQuotaStore = defineStore('quota', {
  state: (): QuotaState => ({
    remaining: 0,
    used: 0,
    max: 10,
    loading: false,
    loaded: false,
  }),
  getters: {
    exhausted: (state) => state.loaded && state.remaining <= 0,
    lowBalance: (state) => state.remaining > 0 && state.remaining <= 2,
  },
  actions: {
    async refresh() {
      this.loading = true
      try {
        const data = await getTodayQuota()
        this.remaining = data.remaining
        this.used = data.used
        this.max = data.max
        this.loaded = true
      } finally {
        this.loading = false
      }
    },
    applyServerSnapshot(payload: { remaining: number; max: number }) {
      this.remaining = payload.remaining
      this.max = payload.max
      this.used = payload.max - payload.remaining
      this.loaded = true
    },
    reset() {
      this.remaining = 0
      this.used = 0
      this.max = 10
      this.loaded = false
    },
  },
})
