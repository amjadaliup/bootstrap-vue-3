import {computed, ComputedRef, Ref} from 'vue'
import type {Alignment} from '../types'

/**
 *
 * @param props
 * @returns
 */
export default (align: Ref<Alignment>): ComputedRef<string> =>
  computed(() =>
    align.value === 'center'
      ? 'justify-content-center'
      : align.value === 'end'
      ? 'justify-content-end'
      : 'justify-content-start'
  )
