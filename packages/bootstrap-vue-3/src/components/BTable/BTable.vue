<template>
  <BTableContainer :responsive="responsive" :responsive-classes="responsiveClasses">
    <table :class="classes">
      <thead>
        <slot v-if="$slots['thead-top']" name="thead-top" />
        <tr>
          <th v-if="addSelectableCell">
            <slot name="selectHead">
              {{ typeof selectHead === 'boolean' ? 'Selected' : selectHead }}
            </slot>
          </th>
          <th
            v-for="field in computedFields"
            :key="field.key"
            scope="col"
            :class="getFieldColumnClasses(field)"
            :title="field.headerTitle"
            :abbr="field.headerAbbr"
            :style="field.thStyle"
            v-bind="field.thAttr"
            @click="headerClicked(field, $event)"
          >
            <div class="d-flex flex-nowrap align-items-center gap-1">
              <span
                v-if="isSortable && field.sortable && field.key === sortBy"
                class="text-muted small"
              >
                <span v-show="sortDesc === true">▼</span>
                <span v-show="sortDesc === false">▲</span>
              </span>
              <div>
                <slot
                  v-if="$slots['head(' + field.key + ')'] || $slots['head()']"
                  :name="$slots['head(' + field.key + ')'] ? 'head(' + field.key + ')' : 'head()'"
                  :label="field.label"
                />
                <template v-else>{{ getFieldHeadLabel(field) }}</template>
              </div>
            </div>
          </th>
        </tr>
        <tr v-if="$slots['thead-sub']">
          <td
            v-for="field in computedFields"
            :key="field.key"
            scope="col"
            :class="[field.class, field.thClass, field.variant ? `table-${field.variant}` : '']"
          >
            <slot
              v-if="$slots['thead-sub']"
              name="thead-sub"
              :items="computedFields"
              v-bind="field"
            />
            <template v-else>{{ field.label }}</template>
          </td>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(tr, ind) in computedItems"
          :key="ind"
          :class="getRowClasses(tr)"
          @click.prevent="onRowClick(tr, ind, $event)"
          @dblclick.prevent="onRowDblClick(tr, ind, $event)"
          @mouseenter.prevent="onRowMouseEnter(tr, ind, $event)"
          @mouseleave.prevent="onRowMouseLeave(tr, ind, $event)"
        >
          <td v-if="addSelectableCell">
            <slot name="selectCell">
              <span :class="selectedItems.has(tr) ? 'text-primary' : ''">🗹</span>
            </slot>
          </td>
          <td
            v-for="(field, index) in computedFields"
            :key="field.key"
            v-bind="field.tdAttr"
            :class="[
              field.class,
              field.tdClass,
              field.variant ? `table-${field.variant}` : '',
              tr?._cellVariants && tr?._cellVariants[field.key]
                ? `table-${tr?._cellVariants[field.key]}`
                : '',
            ]"
          >
            <slot
              v-if="$slots['cell(' + field.key + ')'] || $slots['cell()']"
              :name="$slots['cell(' + field.key + ')'] ? 'cell(' + field.key + ')' : 'cell()'"
              :value="tr[field.key]"
              :index="index"
              :item="tr"
              :field="field"
              :items="items"
            />
            <template v-else>{{ tr[field.key] }}</template>
          </td>
        </tr>
      </tbody>
      <tfoot v-if="footCloneBoolean">
        <tr>
          <th
            v-for="field in computedFields"
            :key="field.key"
            v-bind="field.thAttr"
            scope="col"
            :class="[field.class, field.thClass, field.variant ? `table-${field.variant}` : '']"
            :title="field.headerTitle"
            :abbr="field.headerAbbr"
            :style="field.thStyle"
            @click="headerClicked(field, $event, true)"
          >
            {{ field.label }}
          </th>
        </tr>
      </tfoot>
      <caption v-if="$slots['table-caption']">
        <slot name="table-caption" />
      </caption>
      <caption v-else-if="caption">
        {{
          caption
        }}
      </caption>
    </table>
  </BTableContainer>
</template>

<script setup lang="ts">
// import type {Breakpoint} from '../../types'
import {computed, ref, toRef, useSlots} from 'vue'
import {useBooleanish} from '../../composables'
import {titleCase} from '../../utils/stringUtils'

import type {
  Booleanish,
  ColorVariant,
  TableField,
  TableFieldObject,
  TableItem,
  VerticalAlign,
} from '../../types'
import BTableContainer from './BTableContainer.vue'
import useItemHelper from './itemHelper'

interface BTableProps {
  align?: VerticalAlign
  caption?: string
  captionTop?: Booleanish
  borderless?: Booleanish
  bordered?: Booleanish
  borderVariant?: ColorVariant
  dark?: Booleanish
  fields?: Array<TableField>
  footClone?: Booleanish
  hover?: Booleanish
  items?: Array<TableItem>
  responsive?: boolean | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'
  small?: Booleanish
  striped?: Booleanish
  variant?: ColorVariant
  sortBy?: string
  sortDesc?: Booleanish
  sortInternal?: Booleanish
  selectable?: Booleanish
  selectHead?: boolean | string
  selectMode?: 'multi' | 'single' | 'range'
  selectionVariant?: ColorVariant
}

const props = withDefaults(defineProps<BTableProps>(), {
  captionTop: false,
  borderless: false,
  bordered: false,
  dark: false,
  fields: () => [],
  footClone: false,
  hover: false,
  items: () => [],
  responsive: false,
  small: false,
  striped: false,
  sortDesc: false,
  sortInternal: false,
  selectable: false,
  selectHead: true,
  selectMode: 'single',
  selectionVariant: 'primary',
})

interface BTableEmits {
  (
    e: 'headClicked',
    ...value: Parameters<
      (key: TableFieldObject['key'], field: TableField, event: MouseEvent, isFooter: boolean) => any
    >
  ): void
  (
    e: 'rowClicked',
    ...value: Parameters<(item: TableItem, index: number, event: MouseEvent) => any>
  ): void
  (
    e: 'rowDblClicked',
    ...value: Parameters<(item: TableItem, index: number, event: MouseEvent) => any>
  ): void
  (
    e: 'rowHovered',
    ...value: Parameters<(item: TableItem, index: number, event: MouseEvent) => any>
  ): void
  (
    e: 'rowUnhovered',
    ...value: Parameters<(item: TableItem, index: number, event: MouseEvent) => any>
  ): void
  (e: 'rowSelected', value: TableItem): void
  (e: 'rowUnselected', value: TableItem): void
  (e: 'selection', value: TableItem[]): void
  (e: 'update:sortBy', value: string): void
  (e: 'update:sortDesc', value: boolean): void
  (e: 'sorted', ...value: Parameters<(sortBy: string, isDesc: boolean) => any>): void
}

const emits = defineEmits<BTableEmits>()
const slots = useSlots()

const captionTopBoolean = useBooleanish(toRef(props, 'captionTop'))
const borderlessBoolean = useBooleanish(toRef(props, 'borderless'))
const borderedBoolean = useBooleanish(toRef(props, 'bordered'))
const darkBoolean = useBooleanish(toRef(props, 'dark'))
const footCloneBoolean = useBooleanish(toRef(props, 'footClone'))
const hoverBoolean = useBooleanish(toRef(props, 'hover'))
const smallBoolean = useBooleanish(toRef(props, 'small'))
const stripedBoolean = useBooleanish(toRef(props, 'striped'))
const sortDescBoolean = useBooleanish(toRef(props, 'sortDesc'))
const sortInternalBoolean = useBooleanish(toRef(props, 'sortInternal'))
const selectableBoolean = useBooleanish(toRef(props, 'selectable'))

const classes = computed(() => [
  'table',
  {
    [`align-${props.align}`]: props.align !== undefined,
    [`table-${props.variant}`]: props.variant !== undefined,
    'table-striped': stripedBoolean.value,
    'table-hover': hoverBoolean.value,
    'table-dark': darkBoolean.value,
    'table-bordered': borderedBoolean.value,
    [`border-${props.borderVariant}`]: props.borderVariant !== undefined,
    'table-borderless': borderlessBoolean.value,
    'table-sm': smallBoolean.value,
    'caption-top': captionTopBoolean.value,
    'b-table-selectable': selectableBoolean.value,
    [`b-table-select-${props.selectMode}`]: selectableBoolean.value,
    'b-table-selecting user-select-none': selectableBoolean.value && isSelecting.value,
  },
])

const itemHelper = useItemHelper()
const computedFields = computed(() => itemHelper.normaliseFields(props.fields, props.items))
const computedItems = computed(() =>
  sortInternalBoolean.value === true
    ? itemHelper.sortItems(props.fields, props.items, {
        key: props.sortBy,
        desc: sortDescBoolean.value,
      })
    : props.items
)

const responsiveClasses = computed(() => ({
  'table-responsive': typeof props.responsive === 'boolean' && props.responsive,
  [`table-responsive-${props.responsive}`]: typeof props.responsive === 'string',
}))

const getFieldHeadLabel = (field: TableField) => {
  if (typeof field === 'string') return titleCase(field)
  if (field.label !== undefined) return field.label
  if (typeof field.key === 'string') return titleCase(field.key)
  return field.key
}

const headerClicked = (field: TableField, event: MouseEvent, isFooter = false) => {
  const fieldKey = typeof field === 'string' ? field : field.key
  emits('headClicked', fieldKey, field, event, isFooter)

  handleFieldSorting(field)
}
const onRowClick = (row: TableItem, index: number, e: MouseEvent) => {
  emits('rowClicked', row, index, e)

  handleRowSelection(row, index, e.shiftKey)
}
const onRowDblClick = (row: TableItem, index: number, e: MouseEvent) =>
  emits('rowDblClicked', row, index, e)
const onRowMouseEnter = (row: TableItem, index: number, e: MouseEvent) =>
  emits('rowHovered', row, index, e)
const onRowMouseLeave = (row: TableItem, index: number, e: MouseEvent) =>
  emits('rowUnhovered', row, index, e)

const addSelectableCell = computed(
  () => selectableBoolean.value && (!!props.selectHead || slots.selectHead !== undefined)
)

const isSortable = computed(
  () =>
    props.fields.filter((field) => (typeof field === 'string' ? false : field.sortable)).length > 0
)
const handleFieldSorting = (field: TableField) => {
  if (!isSortable.value) return

  const fieldKey = typeof field === 'string' ? field : field.key
  const fieldSortable = typeof field === 'string' ? false : field.sortable
  if (isSortable.value === true && fieldSortable === true) {
    const sortDesc = !sortDescBoolean.value
    if (fieldKey !== props.sortBy) {
      emits('update:sortBy', fieldKey)
    }
    emits('update:sortDesc', sortDesc)
    emits('sorted', fieldKey, sortDesc)
  }
}

const selectedItems = ref<Set<TableItem>>(new Set([]))
const isSelecting = computed(() => selectedItems.value.size > 0)

const notifySelectionEvent = () => {
  if (!selectableBoolean.value) return
  emits('selection', Array.from(selectedItems.value))
}
const handleRowSelection = (row: TableItem, index: number, shiftClicked = false) => {
  if (!selectableBoolean.value) return

  if (selectedItems.value.has(row)) {
    selectedItems.value.delete(row)
    emits('rowUnselected', row)
  } else {
    if (props.selectMode === 'single' && selectedItems.value.size > 0) {
      selectedItems.value.forEach((item) => emits('rowUnselected', item))
      selectedItems.value.clear()
    }

    if (props.selectMode === 'range' && selectedItems.value.size > 0 && shiftClicked) {
      const lastSelectedItem = Array.from(selectedItems.value).pop()
      const lastSelectedIndex = computedItems.value.findIndex((i) => i === lastSelectedItem)
      const selectStartIndex = Math.min(lastSelectedIndex, index)
      const selectEndIndex = Math.max(lastSelectedIndex, index)
      computedItems.value.slice(selectStartIndex, selectEndIndex + 1).forEach((item) => {
        if (!selectedItems.value.has(item)) {
          selectedItems.value.add(item)
          emits('rowSelected', item)
        }
      })
    } else {
      selectedItems.value.add(row)
      emits('rowSelected', row)
    }
  }

  notifySelectionEvent()
}

const getFieldColumnClasses = (field: TableFieldObject) => [
  field.class,
  field.thClass,
  field.variant ? `table-${field.variant}` : undefined,
  {'b-table-sortable-column': isSortable.value && field.sortable},
]

const getRowClasses = (item: TableItem) => [
  item._rowVariant ? `table-${item._rowVariant}` : null,
  item._rowVariant ? `table-${item._rowVariant}` : null,
  selectableBoolean.value && selectedItems.value.has(item)
    ? `selected table-${props.selectionVariant}`
    : null,
]

const selectAllRows = () => {
  if (!selectableBoolean.value) return
  const unselectableItems = selectedItems.value.size > 0 ? Array.from(selectedItems.value) : []
  selectedItems.value = new Set([...computedItems.value])
  selectedItems.value.forEach((item) => {
    if (unselectableItems.includes(item)) return
    emits('rowSelected', item)
  })
  notifySelectionEvent()
}

const clearSelected = () => {
  if (!selectableBoolean.value) return
  selectedItems.value.forEach((item) => {
    emits('rowUnselected', item)
  })
  selectedItems.value = new Set([])
  notifySelectionEvent()
}

const selectRow = (index: number) => {
  if (!selectableBoolean.value) return
  const item = computedItems.value[index]
  if (!item || selectedItems.value.has(item)) return
  selectedItems.value.add(item)
  emits('rowSelected', item)
  notifySelectionEvent()
}
const unselectRow = (index: number) => {
  if (!selectableBoolean.value) return
  const item = computedItems.value[index]
  if (!item || !selectedItems.value.has(item)) return
  selectedItems.value.delete(item)
  emits('rowUnselected', item)
  notifySelectionEvent()
}

defineExpose({
  selectAllRows,
  clearSelected,
  selectRow,
  unselectRow,
})
</script>
