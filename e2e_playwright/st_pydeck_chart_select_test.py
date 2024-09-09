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

import pytest
from playwright.sync_api import Page, expect

from e2e_playwright.conftest import ImageCompareFunction
from e2e_playwright.shared.app_utils import click_button


# Firefox seems to be failing but can't reproduce locally and video produces an empty page for firefox
@pytest.mark.skip_browser("firefox")
def test_pydeck_chart_multiselect_interactions_and_return_values(app: Page):
    """
    Test single selection, multi selection, and deselection all function
    properly and return the expected values in both session_state and as a
    return of st.pydeck.
    """
    # The pydeck chart takes a while to load so check that
    # it gets attached with an increased timeout.
    pydeck_charts = app.get_by_test_id("stDeckGlJsonChart")
    expect(pydeck_charts).to_have_count(1, timeout=15000)

    # The map assets can take more time to load, add an extra timeout
    # to prevent flakiness.
    app.wait_for_timeout(10000)

    # Find canvas with class name "mapboxgl-canvas"
    expect(app.locator(".mapboxgl-canvas")).to_be_visible()

    # Assert we haven't yet written anything out for the debugging state
    expect(app.get_by_text("objects")).to_have_count(0)

    click_handling_div = app.locator("#view-default-view")

    # Click on the hex that has count: 10
    click_handling_div.click(position={"x": 344, "y": 201})

    # Assert that we are printing out the Streamlit custom `objects` return
    # state
    expect(app.get_by_text("objects")).to_have_count(2)
    # Assert the values returned are correct for the point we selected
    expect(app.get_by_text('"count":10')).to_have_count(4)
    # This might look a little confusing, but the output is printing out array
    # index and the index of the item selected
    expect(app.get_by_text('"indices":[0:0]')).to_have_count(2)

    # Multiselect and click the hex that has count: 100
    click_handling_div.click(position={"x": 417, "y": 229}, modifiers=["Shift"])

    # Same assert as above, we should be only rendering the same top-level
    # `objects` field
    expect(app.get_by_text("objects")).to_have_count(2)

    # Now we assert that the values include the new point we selected as well as
    # the previous one
    expect(app.get_by_text('"count":10')).to_have_count(4)
    expect(app.get_by_text('"count":100')).to_have_count(4)

    # This might look a little confusing, but the output is printing out array
    # index and the index of the item selected. We are asserting that we clicked
    # the 0th point first, and the 2nd point second. They are visually printed
    # on separate lines, but in order to select them, we must use the
    # non-whitespace version.
    expect(app.get_by_text('"indices":[0:01:2]')).to_have_count(2)

    # Deselect everything by clicking away from an object in a layer
    click_handling_div.click(position={"x": 0, "y": 0})

    # Assert that we have deselected everything
    expect(app.get_by_text('"objects":[]')).to_have_count(2)
    expect(app.get_by_text('"indices":[]')).to_have_count(2)


# Firefox seems to be failing but can't reproduce locally and video produces an empty page for firefox
@pytest.mark.skip_browser("firefox")
def test_pydeck_chart_multiselect_has_consistent_visuals(
    app: Page, assert_snapshot: ImageCompareFunction
):
    """
    Test that no selection, single selection, multi selection, and deselection
    all look visually correct.
    """
    # The pydeck chart takes a while to load so check that
    # it gets attached with an increased timeout.
    pydeck_charts = app.get_by_test_id("stDeckGlJsonChart")
    expect(pydeck_charts).to_have_count(1, timeout=15000)

    # The map assets can take more time to load, add an extra timeout
    # to prevent flakiness.
    app.wait_for_timeout(10000)

    # Find canvas with class name "mapboxgl-canvas"
    expect(app.locator(".mapboxgl-canvas")).to_be_visible()
    click_handling_div = app.locator("#view-default-view")

    assert_snapshot(
        click_handling_div,
        name="st_pydeck_chart_select-no-selections",
        # The pydeck tests are a lot flakier than need be so increase the pixel
        # threshold
        pixel_threshold=1.0,
    )

    # Click on the hex that has count: 10
    click_handling_div.click(position={"x": 344, "y": 201})

    # DeckGL can take a bit to re-render, so give it some extra time before
    # snapshotting to prevent flakiness
    app.wait_for_timeout(1000)

    assert_snapshot(
        click_handling_div,
        name="st_pydeck_chart_select-single-selection",
        # The pydeck tests are a lot flakier than need be so increase the pixel
        # threshold
        pixel_threshold=1.0,
    )

    # Multiselect and click the hex that has count: 100
    click_handling_div.click(position={"x": 417, "y": 229}, modifiers=["Shift"])

    # DeckGL can take a bit to re-render, so give it some extra time before
    # snapshotting to prevent flakiness
    app.wait_for_timeout(1000)

    assert_snapshot(
        click_handling_div,
        name="st_pydeck_chart_select-multi-selection",
        # The pydeck tests are a lot flakier than need be so increase the pixel
        # threshold
        pixel_threshold=1.0,
    )

    # Deselect everything by clicking away from an object in a layer
    click_handling_div.click(position={"x": 0, "y": 0})

    # DeckGL can take a bit to re-render, so give it some extra time before
    # snapshotting to prevent flakiness
    app.wait_for_timeout(1000)

    # Assert that we have deselected everything
    assert_snapshot(
        click_handling_div,
        name="st_pydeck_chart_select-deselected",
        # The pydeck tests are a lot flakier than need be so increase the pixel
        # threshold
        pixel_threshold=1.0,
    )


# Firefox seems to be failing but can't reproduce locally and video produces an empty page for firefox
@pytest.mark.skip_browser("firefox")
def test_pydeck_chart_selection_state_remains_after_unmounting(
    app: Page, assert_snapshot: ImageCompareFunction
):
    """
    Test that no selection, single selection, multi selection, and deselection
    all look visually correct.
    """
    # The pydeck chart takes a while to load so check that
    # it gets attached with an increased timeout.
    pydeck_charts = app.get_by_test_id("stDeckGlJsonChart")
    expect(pydeck_charts).to_have_count(1, timeout=15000)

    # The map assets can take more time to load, add an extra timeout
    # to prevent flakiness.
    app.wait_for_timeout(10000)

    # Find canvas with class name "mapboxgl-canvas"
    expect(app.locator(".mapboxgl-canvas")).to_be_visible()
    click_handling_div = app.locator("#view-default-view")

    assert_snapshot(
        click_handling_div,
        name="st_pydeck_chart_select-no-selections",
        # The pydeck tests are a lot flakier than need be so increase the pixel
        # threshold
        pixel_threshold=1.0,
    )

    # Click on the hex that has count: 10
    click_handling_div.click(position={"x": 344, "y": 201})

    # DeckGL can take a bit to re-render, so give it some extra time before
    # moving on to prevent flakiness
    app.wait_for_timeout(1000)

    # Multiselect and click the hex that has count: 100
    click_handling_div.click(position={"x": 417, "y": 229}, modifiers=["Shift"])

    # DeckGL can take a bit to re-render, so give it some extra time before
    # moving on to prevent flakiness
    app.wait_for_timeout(1000)

    click_button(app, "Create some elements to unmount component")

    # The pydeck chart takes a while to load so check that
    # it gets attached with an increased timeout.
    pydeck_charts = app.get_by_test_id("stDeckGlJsonChart")
    expect(pydeck_charts).to_have_count(1, timeout=15000)

    # The map assets can take more time to load, add an extra timeout
    # to prevent flakiness.
    app.wait_for_timeout(10000)

    click_handling_div.scroll_into_view_if_needed()

    assert_snapshot(
        click_handling_div,
        name="st_pydeck_chart_selection_state_remains_after_unmounting",
    )
