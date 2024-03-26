# Copyright (c) Streamlit Inc. (2018-2022) Snowflake Inc. (2022-2024)
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.


from playwright.sync_api import Page, expect

from e2e_playwright.conftest import (
    ImageCompareFunction,
    wait_for_app_loaded,
    wait_for_app_run,
)


def test_displays_maps_properly(
    app: Page, app_port: str, assert_snapshot: ImageCompareFunction
):
    map_charts = app.get_by_test_id("stDeckGlJsonChart")
    expect(map_charts).to_have_count(7)

    data_warning_caps = app.get_by_test_id("stCaptionContainer")
    expect(data_warning_caps).to_have_count(2)
    expect(data_warning_caps.nth(0)).to_have_text(
        "⚠️ Showing only 10k rows. Call collect() on the dataframe to show more."
    )
    expect(data_warning_caps.nth(1)).to_have_text(
        "⚠️ Showing only 10k rows. Call collect() on the dataframe to show more."
    )

    assert_snapshot(map_charts.nth(5).locator("canvas").nth(0), name="st_map-basic")
    assert_snapshot(map_charts.nth(6).locator("canvas").nth(0), name="st_map-complex")

    app.goto(f"http://localhost:{app_port}/?embed_options='dark_theme'")
    wait_for_app_loaded(app)
    wait_for_app_run(app, 10000)

    assert_snapshot(
        map_charts.nth(5).locator("canvas").nth(0), name="st_map-basic_dark"
    )
    assert_snapshot(
        map_charts.nth(6).locator("canvas").nth(0), name="st_map-complex_dark"
    )
