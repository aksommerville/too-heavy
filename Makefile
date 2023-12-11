all:
.SILENT:
.SECONDARY:
PRECMD=echo "  $(@F)" ; mkdir -p $(@D) ;

DST_HTML:=out/web/index.html
SRCFILES:=$(shell find src/www src/data -type f)
$(DST_HTML):etc/tool/mkhtml.js $(SRCFILES);$(PRECMD) node $^ -o$@
all:$(DST_HTML)

DST_WRAPPER:=out/web/wrapper.html
DST_FAVICON:=out/web/favicon.ico
$(DST_WRAPPER):src/wrapper.html;$(PRECMD) cp $< $@
$(DST_FAVICON):src/favicon.ico;$(PRECMD) cp $< $@
all:$(DST_WRAPPER) $(DST_FAVICON)

edit:;node src/server/main.js src
run:$(DST_HTML) $(DST_WRAPPER) $(DST_FAVICON);node src/server/main.js out/web --make

clean:;rm -rf mid out
