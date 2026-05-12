def compute_speech_regions(
    words: list[dict],
    segment_start: float,
    segment_end: float,
    min_gap: float = 0.5,
    max_gap: float = 2.0,
    padding: float = 0.1,
) -> list[tuple[float, float]]:
    """
    Returns list of (start, end) speech regions with silences removed.

    Gaps >= min_gap between words are cut. Gaps > max_gap are clamped to max_gap
    so we don't lose visual context on very long pauses.
    """
    if not words:
        return [(segment_start, segment_end)]

    regions = []
    current_start = max(segment_start, words[0]["start"] - padding)
    current_end = words[0]["end"] + padding

    for prev, curr in zip(words, words[1:]):
        gap = curr["start"] - prev["end"]
        if gap >= min_gap:
            keep_silence = min(gap, max_gap) - min_gap
            current_end = prev["end"] + padding + keep_silence / 2
            regions.append((
                max(segment_start, current_start),
                min(segment_end, current_end),
            ))
            current_start = curr["start"] - padding - keep_silence / 2
            current_end = curr["end"] + padding
        else:
            current_end = curr["end"] + padding

    regions.append((
        max(segment_start, current_start),
        min(segment_end, current_end),
    ))

    return [(max(segment_start, s), min(segment_end, e)) for s, e in regions if s < e]
