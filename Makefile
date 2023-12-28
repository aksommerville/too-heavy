all:
.SILENT:
.SECONDARY:
PRECMD=echo "  $(@F)" ; mkdir -p $(@D) ;

DST_HTML:=out/web/index.html
SRCFILES:=$(shell find src/www src/data -type f)
ENCODERBITS:=etc/tool/reencodeSong.js etc/tool/minifyJavascript.js
$(DST_HTML):etc/tool/mkhtml.js $(SRCFILES) $(ENCODERBITS);$(PRECMD) node etc/tool/mkhtml.js $(SRCFILES) -o$@
all:$(DST_HTML)

DST_WRAPPER:=out/web/wrapper.html
DST_FAVICON:=out/web/favicon.ico
$(DST_WRAPPER):src/wrapper.html;$(PRECMD) cp $< $@
$(DST_FAVICON):src/favicon.ico;$(PRECMD) cp $< $@
all:$(DST_WRAPPER) $(DST_FAVICON)

# `make run` serves the editor too.
# We could declare DST_WRAPPER and DST_FAVICON as "--makeable" too, but they won't change much so avoid the extra churn.
run:$(DST_HTML) $(DST_WRAPPER) $(DST_FAVICON);node src/server/main.js src out/web --makeable=$(DST_HTML) --put=src

clean:;rm -rf mid out
