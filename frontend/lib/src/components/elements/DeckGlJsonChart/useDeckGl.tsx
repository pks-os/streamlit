/**
 * Copyright (c) Streamlit Inc. (2018-2022) Snowflake Inc. (2022-2024)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useCallback, useEffect, useMemo, useState } from "react"

import JSON5 from "json5"
import { PickingInfo } from "@deck.gl/core/typed"
import isEqual from "lodash/isEqual"
import { ViewStateChangeParameters } from "@deck.gl/core/typed/controllers/controller"
import { TooltipContent } from "@deck.gl/core/typed/lib/tooltip"
import queryString from "query-string"

import { EmotionTheme } from "@streamlit/lib/src/theme"
import { assertNever } from "@streamlit/lib/src/util/assertNever"
import { hexToRgba } from "@streamlit/lib/src/util/hexToRgba"

import type {
  DeckObject,
  LayerSelection,
  ParsedDeckGlConfig,
  PropsWithHeight,
} from "./types"
import { jsonConverter } from "./utils/jsonConverter"
import {
  FillFunction,
  getContextualFillColor,
  LAYER_TYPE_TO_FILL_FUNCTION,
  type LayerSelectionColorMode,
} from "./utils/colors"

type UseDeckGlShape = {
  createTooltip: (info: PickingInfo | null) => TooltipContent
  deck: DeckObject
  onViewStateChange: (params: ViewStateChangeParameters) => void
  setSelection: React.Dispatch<
    React.SetStateAction<Record<string, LayerSelection>>
  >
  viewState: Record<string, unknown>
}

type VisualLayerSelectionMode = "perLayer" | "perMap"

export type UseDeckGlProps = Omit<
  PropsWithHeight,
  "mapboxToken" | "fragmentId"
> & {
  isLightTheme: boolean
  layerSelectionColorMode?: LayerSelectionColorMode
  theme: EmotionTheme
  visualLayerSelectionMode?: VisualLayerSelectionMode
}

const DEFAULT_DECK_GL_HEIGHT = 500

/**
 * Interpolates variables within a string using values from a PickingInfo object.
 *
 * This function searches for placeholders in the format `{variable}` within the provided
 * string `body` and replaces them with corresponding values from the `info` object.
 * It first checks if the variable exists directly on `info.object`, and if not, it checks
 * within `info.object.properties`.
 *
 * @param {PickingInfo} info - The object containing the data to interpolate into the string.
 * @param {string} body - The string containing placeholders in the format `{variable}`.
 * @returns {string} - The interpolated string with placeholders replaced by actual values.
 */
const interpolate = (info: PickingInfo, body: string): string => {
  const matchedVariables = body.match(/{(.*?)}/g)
  if (matchedVariables) {
    matchedVariables.forEach((match: string) => {
      const variable = match.substring(1, match.length - 1)

      if (info.object.hasOwnProperty(variable)) {
        body = body.replace(match, info.object[variable])
      } else if (
        info.object.hasOwnProperty("properties") &&
        info.object.properties.hasOwnProperty(variable)
      ) {
        body = body.replace(match, info.object.properties[variable])
      }
    })
  }
  return body
}

const getShouldUseOriginalFillFunction = (
  selectedIndices: number[],
  anyLayersHaveSelection: boolean,
  visualLayerSelectionMode: VisualLayerSelectionMode
): boolean => {
  switch (visualLayerSelectionMode) {
    case "perLayer":
      return selectedIndices.length === 0
    case "perMap":
      return !anyLayersHaveSelection
    default:
      assertNever(visualLayerSelectionMode)
      return false
  }
}

export const useDeckGl = (props: UseDeckGlProps): UseDeckGlShape => {
  const { element, height, isLightTheme, theme, widgetMgr, width } = props
  const { tooltip, useContainerWidth: shouldUseContainerWidth } = element

  //#region QueryString Parsing
  // TODO: Remove this region. This is only here for easy testing while we iterate on our options.
  const parsedQueryString = queryString.parse(window.location.search)
  const layerSelectionColorMode = (parsedQueryString.layerSelectionColorMode ||
    props.layerSelectionColorMode ||
    "opacity") as LayerSelectionColorMode
  const visualLayerSelectionMode =
    (parsedQueryString.visualLayerSelectionMode ||
      props.visualLayerSelectionMode ||
      "perMap") as VisualLayerSelectionMode
  const unselectedOpacity = parsedQueryString.unselectedOpacity
    ? parseInt(parsedQueryString.unselectedOpacity as string)
    : undefined
  //#endregion

  const [selection, setSelection] = useState<Record<string, LayerSelection>>(
    () => {
      const initialFigureState = widgetMgr.getElementState(
        element.id,
        "selection"
      )

      return initialFigureState ?? {}
    }
  )

  const [viewState, setViewState] = useState<Record<string, unknown>>({
    bearing: 0,
    pitch: 0,
    zoom: 11,
  })

  const [initialViewState, setInitialViewState] = useState<
    Record<string, unknown>
  >({})

  const isFullScreen = props.isFullScreen ?? false

  const parsedPydeckJson = useMemo(() => {
    return Object.freeze(JSON5.parse<ParsedDeckGlConfig>(element.json))
    // Only parse JSON when transitioning to/from fullscreen, the json changes, or theme changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFullScreen, isLightTheme, element.json])

  const deck = useMemo<DeckObject>(() => {
    const copy = { ...parsedPydeckJson }

    // If unset, use either the Mapbox light or dark style based on Streamlit's theme
    // For Mapbox styles, see https://docs.mapbox.com/api/maps/styles/#mapbox-styles
    if (!copy.mapStyle) {
      copy.mapStyle = `mapbox://styles/mapbox/${
        isLightTheme ? "light" : "dark"
      }-v9`
    }

    // Set width and height based on the fullscreen state
    if (isFullScreen) {
      Object.assign(copy.initialViewState, { width, height })
    } else {
      if (!copy.initialViewState.height) {
        copy.initialViewState.height = DEFAULT_DECK_GL_HEIGHT
      }
      if (shouldUseContainerWidth) {
        copy.initialViewState.width = width
      }
    }

    if (
      copy.layers &&
      // If the layerSelectionColorMode is original, Streamlit does not change
      // any colors of the objects in layers
      layerSelectionColorMode !== "original"
    ) {
      const anyLayersHaveSelection = Object.values(selection).some(
        ({ indices }) => indices?.length
      )

      copy.layers = copy.layers.map(layer => {
        if (!layer || Array.isArray(layer)) {
          return layer
        }

        const layerId = `${layer.id || null}`
        const selectedIndices = selection[layerId]?.indices || []

        const fillFunction = LAYER_TYPE_TO_FILL_FUNCTION[layer["@@type"]]

        if (!fillFunction || !Object.hasOwn(layer, fillFunction)) {
          return layer
        }

        const clonedLayer = { ...layer }
        clonedLayer.updateTriggers = {
          // Tell Deck.gl to recompute the fill color when the selection changes.
          // Without this, objects in layers will have stale colors when selection changes.
          // @see https://deck.gl/docs/api-reference/core/layer#updatetriggers
          [fillFunction]: [
            ...(clonedLayer.updateTriggers?.[fillFunction] || []),
            selectedIndices,
            anyLayersHaveSelection,
          ],
        }

        const shouldUseOriginalFillFunction = getShouldUseOriginalFillFunction(
          selectedIndices,
          anyLayersHaveSelection,
          visualLayerSelectionMode
        )

        if (shouldUseOriginalFillFunction) {
          // If we aren't changing the fill color, we don't need to change the fillFunction
          return clonedLayer
        }

        const originalFillFunction = layer[fillFunction] as FillFunction

        const selectedColor = hexToRgba(theme.colors.primary)
        const unselectedColor = hexToRgba(theme.colors.gray20)

        const newFillFunction: FillFunction = (object, objectInfo) => {
          return getContextualFillColor({
            isSelected: selectedIndices.includes(objectInfo.index),
            layerSelectionColorMode,
            object,
            objectInfo,
            originalFillFunction,
            selectedColor,
            unselectedColor,
            unselectedOpacity,
          })
        }

        clonedLayer[fillFunction] = newFillFunction

        return clonedLayer
      })
    }

    delete copy?.views // We are not using views. This avoids a console warning.

    return jsonConverter.convert(copy)
  }, [
    height,
    isFullScreen,
    isLightTheme,
    layerSelectionColorMode,
    parsedPydeckJson,
    selection,
    shouldUseContainerWidth,
    theme.colors.gray20,
    theme.colors.primary,
    unselectedOpacity,
    visualLayerSelectionMode,
    width,
  ])

  useEffect(() => {
    // If the ViewState on the server has changed, apply the diff to the current state
    if (!isEqual(deck.initialViewState, initialViewState)) {
      const diff = Object.keys(deck.initialViewState).reduce(
        (diff, key): any => {
          // @ts-expect-error
          if (deck.initialViewState[key] === initialViewState[key]) {
            return diff
          }

          return {
            ...diff,
            // @ts-expect-error
            [key]: deck.initialViewState[key],
          }
        },
        {}
      )

      setViewState({ ...viewState, ...diff })
      setInitialViewState(deck.initialViewState)
    }
  }, [deck.initialViewState, initialViewState, viewState])

  const createTooltip = useCallback(
    (info: PickingInfo | null): TooltipContent => {
      if (!info || !info.object || !tooltip) {
        return null
      }

      const parsedTooltip = JSON5.parse(tooltip)

      if (parsedTooltip.html) {
        parsedTooltip.html = interpolate(info, parsedTooltip.html)
      } else {
        parsedTooltip.text = interpolate(info, parsedTooltip.text)
      }

      return parsedTooltip
    },
    [tooltip]
  )

  const onViewStateChange = useCallback(
    ({ viewState }: ViewStateChangeParameters) => {
      setViewState(viewState)
    },
    [setViewState]
  )

  return {
    createTooltip,
    deck,
    onViewStateChange,
    setSelection,
    viewState,
  }
}
