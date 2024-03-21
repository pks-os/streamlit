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

import { Alert as AlertProto } from "@streamlit/lib/src/proto"
import StreamlitMarkdown from "@streamlit/lib/src/components/shared/StreamlitMarkdown"
import { EmojiIcon } from "@streamlit/lib/src/components/shared/Icon"
import AlertContainer, {
  Kind,
} from "@streamlit/lib/src/components/shared/AlertContainer"
import { StyledAlertContent } from "./styled-components"

export function getAlertElementKind(format: AlertProto.Format): Kind {
  switch (format) {
    case AlertProto.Format.ERROR:
      return Kind.ERROR
    case AlertProto.Format.INFO:
      return Kind.INFO
    case AlertProto.Format.SUCCESS:
      return Kind.SUCCESS
    case AlertProto.Format.WARNING:
      return Kind.WARNING
    default:
      throw new Error(`Unexpected alert type: ${format}`)
  }
}

export interface AlertElementProps {
  body: string
  icon?: string
  kind: Kind
  width: number
}

/**
 * Display an (error|warning|info|success) box with a Markdown-formatted body.
 */
export default function AlertElement({
  icon,
  body,
  kind,
  width,
}: AlertElementProps): ReactElement {
  const markdownWidth = {
    // Fix issue #6394 - Need to account for 1.25rem padding + 0.5rem gap when icon present
    width: icon ? `calc(100% - 1.75rem)` : "100%",
  }

  return (
    <div className="stAlert" data-testid="stAlert">
      <AlertContainer width={width} kind={kind}>
        <StyledAlertContent>
          {icon && (
            <EmojiIcon testid="stAlertEmojiIcon" size="lg">
              {icon}
            </EmojiIcon>
          )}
          <StreamlitMarkdown
            source={body}
            allowHTML={false}
            style={markdownWidth}
          />
        </StyledAlertContent>
      </AlertContainer>
    </div>
  )
}