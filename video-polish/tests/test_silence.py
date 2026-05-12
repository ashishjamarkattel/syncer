import pytest

from app.pipeline.silence import compute_speech_regions


def test_empty_words_returns_full_segment():
    regions = compute_speech_regions([], 0.0, 10.0)
    assert regions == [(0.0, 10.0)]


def test_single_word_no_gap():
    words = [{"word": "hello", "start": 1.0, "end": 1.5}]
    regions = compute_speech_regions(words, 0.0, 5.0)
    assert len(regions) == 1
    s, e = regions[0]
    assert s <= 1.0
    assert e >= 1.5


def test_small_gap_not_cut():
    words = [
        {"word": "hello", "start": 0.0, "end": 0.5},
        {"word": "world", "start": 0.8, "end": 1.3},
    ]
    # gap = 0.3 < min_gap=0.5, so no split
    regions = compute_speech_regions(words, 0.0, 2.0)
    assert len(regions) == 1


def test_large_gap_causes_split():
    words = [
        {"word": "hello", "start": 0.0, "end": 0.5},
        {"word": "world", "start": 3.0, "end": 3.5},
    ]
    # gap = 2.5 >= min_gap=0.5, so split
    regions = compute_speech_regions(words, 0.0, 5.0)
    assert len(regions) == 2


def test_regions_clamped_to_segment_bounds():
    words = [{"word": "hi", "start": 1.0, "end": 1.2}]
    regions = compute_speech_regions(words, 2.0, 4.0)
    for s, e in regions:
        assert s >= 2.0
        assert e <= 4.0


def test_huge_gap_clamped_to_max_gap():
    words = [
        {"word": "start", "start": 0.0, "end": 0.5},
        {"word": "end", "start": 60.0, "end": 60.5},
    ]
    # gap = 59.5s, max_gap=2.0 — the kept silence between regions should be capped
    regions = compute_speech_regions(words, 0.0, 61.0, min_gap=0.5, max_gap=2.0)
    assert len(regions) == 2
    total_duration = sum(e - s for s, e in regions)
    # Should be much less than 61 seconds
    assert total_duration < 5.0


def test_multiple_words_no_gaps():
    words = [
        {"word": "one", "start": 0.0, "end": 0.3},
        {"word": "two", "start": 0.35, "end": 0.65},
        {"word": "three", "start": 0.7, "end": 1.0},
    ]
    regions = compute_speech_regions(words, 0.0, 2.0)
    assert len(regions) == 1


def test_regions_are_non_empty():
    words = [
        {"word": "a", "start": 0.0, "end": 0.1},
        {"word": "b", "start": 2.0, "end": 2.1},
        {"word": "c", "start": 4.0, "end": 4.1},
    ]
    regions = compute_speech_regions(words, 0.0, 5.0)
    for s, e in regions:
        assert e > s, f"Empty region: ({s}, {e})"
