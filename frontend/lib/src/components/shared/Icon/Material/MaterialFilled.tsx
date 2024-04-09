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

import React, { ReactElement } from "react"
import { IconSize, ThemeColor } from "@streamlit/lib/src/theme"
import Icon from "@streamlit/lib/src/components/shared/Icon/Icon"
import * as MaterialIcons from "@emotion-icons/material"

interface MaterialIconProps {
  iconName: string
  size?: IconSize
  color?: ThemeColor
  margin?: string
  padding?: string
  testid?: string
}

const MaterialFilled = ({
  iconName,
  ...props
}: MaterialIconProps): ReactElement => {
  if (!(iconName in MaterialIcons)) {
    throw new Error(`Invalid Material Icon: ${iconName}`)
  }
  // eslint-disable-next-line import/namespace
  const content = MaterialIcons[iconName as keyof typeof MaterialIcons]

  return <Icon content={content} {...props} />
}

export default MaterialFilled