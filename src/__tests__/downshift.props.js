// this is stuff that I couldn't think fit anywhere else
// but we still want to have tested.

import * as React from 'react'
import {act, render, fireEvent, waitFor} from '@testing-library/react'
import Downshift from '../'

test('onStateChange called with changes and downshift state and helpers', async () => {
  const handleStateChange = jest.fn()
  const controlledState = {
    inputValue: '',
    selectedItem: null,
  }
  const {selectItem} = setup({
    ...controlledState,
    onStateChange: handleStateChange,
  })
  const itemToSelect = 'foo'
  selectItem(itemToSelect)
  const changes = {
    type: Downshift.stateChangeTypes.unknown,
    inputValue: itemToSelect,
    selectedItem: itemToSelect,
  }
  const stateAndHelpers = {
    ...controlledState,
    isOpen: false,
    highlightedIndex: null,
    selectItem,
  }
  await waitFor(() => {
    expect(handleStateChange).toHaveBeenLastCalledWith(
      changes,
      expect.objectContaining(stateAndHelpers),
    )
  })
})

test('onChange called when clearSelection is triggered', async () => {
  const handleChange = jest.fn()
  const {clearSelection} = setup({
    selectedItem: 'foo',
    onChange: handleChange,
  })
  clearSelection()
  await waitFor(() => expect(handleChange).toHaveBeenCalledTimes(1))
  expect(handleChange).toHaveBeenCalledWith(null, expect.any(Object))
})

test('onChange only called when the selection changes', async () => {
  const handleChange = jest.fn()
  const {selectItem} = setup({
    onChange: handleChange,
  })
  selectItem('foo')
  await waitFor(() => expect(handleChange).toHaveBeenCalledTimes(1))
  expect(handleChange).toHaveBeenCalledWith('foo', expect.any(Object))
  handleChange.mockClear()
  selectItem('foo')
  await waitFor(() => expect(handleChange).toHaveBeenCalledTimes(0))
})

test('onSelect called whenever selection happens, even if the item is the same', async () => {
  const handleSelect = jest.fn()
  const {selectItem} = setup({
    onSelect: handleSelect,
  })
  selectItem('foo')
  await waitFor(() => {
    expect(handleSelect).toHaveBeenCalledTimes(1)
  })
  expect(handleSelect).toHaveBeenCalledWith('foo', expect.any(Object))
  handleSelect.mockClear()
  selectItem('foo')
  await waitFor(() => {
    expect(handleSelect).toHaveBeenCalledTimes(1)
  })
})

test('onSelect not called when nothing was selected', () => {
  const handleSelect = jest.fn()
  const {openMenu} = setup({
    onSelect: handleSelect,
  })
  openMenu()
  expect(handleSelect).not.toHaveBeenCalled()
})

test('uses given environment', () => {
  const environment = {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    document: {
      getElementById: jest.fn(() => document.createElement('div')),
    },
  }
  const {unmount, setHighlightedIndex} = setup({environment})
  setHighlightedIndex()
  unmount()
  expect(environment.addEventListener).toHaveBeenCalledTimes(5)
  expect(environment.removeEventListener).toHaveBeenCalledTimes(5)
})

test('can override onOuterClick callback to maintain isOpen state', async () => {
  const renderFn = () => <div />
  const onOuterClick = jest.fn()
  const {openMenu} = setup({render: renderFn, onOuterClick})
  act(() => {
    openMenu()
  })
  mouseDownAndUp(document.body)
  await waitFor(() => expect(onOuterClick).toHaveBeenCalledTimes(1))
  expect(onOuterClick).toHaveBeenCalledWith(
    expect.objectContaining({
      // just verify that it's the controller object
      isOpen: false,
      getItemProps: expect.any(Function),
    }),
  )
})

test('onInputValueChange called when changes contain inputValue', () => {
  const handleInputValueChange = jest.fn()
  const {selectItem} = setup({
    onInputValueChange: handleInputValueChange,
  })
  selectItem('foo')
  expect(handleInputValueChange).toHaveBeenCalledTimes(1)
  expect(handleInputValueChange).toHaveBeenCalledWith('foo', expect.any(Object))
})

test('onInputValueChange not called when changes do not contain inputValue', () => {
  const handleInputValueChange = jest.fn()
  const {openMenu} = setup({
    onInputValueChange: handleInputValueChange,
  })

  openMenu()

  expect(handleInputValueChange).toHaveBeenCalledTimes(0)
})

test('onInputValueChange called with empty string on reset', async () => {
  const handleInputValueChange = jest.fn()
  const {reset} = setup({
    onInputValueChange: handleInputValueChange,
  })
  reset()
  await waitFor(() => expect(handleInputValueChange).toHaveBeenCalledTimes(1))
  expect(handleInputValueChange).toHaveBeenCalledWith('', expect.any(Object))
})

test('defaultHighlightedIndex will be used for the highlighted index on reset', async () => {
  const {reset, childrenSpy} = setup({defaultHighlightedIndex: 0})
  childrenSpy.mockClear()
  reset()
  await waitFor(() => {
    expect(childrenSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        highlightedIndex: 0,
      }),
    )
  })
})

test('stateReducer customizes the final state after keyDownEnter handled', async () => {
  const {childrenSpy, openMenu, selectHighlightedItem} = setup({
    defaultHighlightedIndex: 0,
    stateReducer: (state, stateToSet) => {
      switch (stateToSet.type) {
        case Downshift.stateChangeTypes.keyDownEnter:
          return {
            ...stateToSet,
            isOpen: state.isOpen,
            highlightedIndex: state.highlightedIndex,
          }
        default:
          return stateToSet
      }
    },
  })
  childrenSpy.mockClear()
  openMenu()
  selectHighlightedItem({
    type: Downshift.stateChangeTypes.keyDownEnter,
  })
  await waitFor(() => {
    expect(childrenSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        isOpen: true,
        highlightedIndex: 0,
      }),
    )
  })
})

function mouseDownAndUp(node) {
  fireEvent.mouseDown(node)
  fireEvent.mouseUp(node)
}

function setup({render: renderFn = () => <div />, ...props} = {}) {
  let renderArg
  const childrenSpy = jest.fn(controllerArg => {
    renderArg = controllerArg
    return renderFn(controllerArg)
  })
  const utils = render(<Downshift {...props}>{childrenSpy}</Downshift>)
  return {childrenSpy, ...utils, ...renderArg}
}
