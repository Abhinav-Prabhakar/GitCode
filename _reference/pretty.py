#!/usr/bin/env python3
"""Indent a chunk of HTML so it is readable. Not a validator; ignores void tags."""
import sys
from html.parser import HTMLParser

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link",
        "meta", "param", "source", "track", "wbr"}
INLINE = {"a", "span", "b", "i", "em", "strong", "code", "small", "svg", "path",
          "use", "label", "sup", "sub", "kbd", "br", "time", "img"}


class P(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.out = []
        self.depth = 0
        self.stack = []

    def emit(self, text):
        self.out.append("  " * self.depth + text)

    def handle_decl(self, decl):
        self.emit("<!%s>" % decl)

    def handle_starttag(self, tag, attrs):
        a = "".join(' %s="%s"' % (k, (v or "")) for k, v in attrs)
        self.out.append("  " * self.depth + "<%s%s>" % (tag, a))
        if tag not in VOID:
            self.depth += 1
            self.stack.append(tag)

    def handle_startendtag(self, tag, attrs):
        a = "".join(' %s="%s"' % (k, (v or "")) for k, v in attrs)
        self.emit("<%s%s/>" % (tag, a))

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        if self.stack and self.stack[-1] == tag:
            self.stack.pop()
            self.depth = max(0, self.depth - 1)
            self.emit("</%s>" % tag)
        else:
            self.emit("</%s>" % tag)

    def handle_data(self, data):
        d = data.strip()
        if d:
            self.emit(d)

    def handle_comment(self, data):
        self.emit("<!-- %s -->" % data.strip()[:80])


if __name__ == "__main__":
    src = open(sys.argv[1]).read()
    p = P()
    p.feed(src)
    print("\n".join(p.out))
