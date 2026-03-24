# LLM Security — Markdown renderer test

Lately I've been thinking about LLM security a fair bit. This entry doubles as a **smoke test** for the retro markdown highlighter: *italic*, __bold__, and `inline code` should all get delimiter styling.

## ATX headings

### H3

#### H4

##### H5

###### H6

## Setext-style heading (below)

Setext uses a text line plus underlines. The next two lines are one H1-style title for the tokenizer:

Markdown renderer smoke test
============================

## Lists and blockquotes

Unordered:

- First item with **bold** inside
- Second item with a [link to example](https://example.com)
- Third item

Ordered:

1. Step one
2. Step two with `code`
3. Step three

Blockquote-style lines (if your pipeline treats `>` as quotes):

> A short quoted line about prompt injection.
> A second line in the same block.

## Fenced code block

```javascript
function sanitize(userInput) {
  // Renderer test: brackets, "quotes", and <tags>
  return userInput.trim();
}
```

## Indented code block

    const twoSpaces = "indented block";
    return twoSpaces;

## Horizontal rules

Blank line, then `---` alone on a line:

---

Blank line, then `* * *`:

* * *

## Images and links

![Alt text for test image](/koen.jpg)

Read more on [OWASP LLM Top 10](https://owasp.org/www-project-top-10-for-large-language-model-applications/).

## Strikethrough and line breaks

This sentence uses ~~strikethrough~~ delimiters.

End this line with two spaces before newline for a hard break.  
This should start on a new line within the same paragraph (if supported).

## Mixed inline

Combine **_bold italic_**, a `variable_name`, and a [link with `code` in label](https://example.com) in one sentence.

That covers the main constructs this tokenizer is built to highlight.
