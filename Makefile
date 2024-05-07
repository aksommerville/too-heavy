all:
.SILENT:
.SECONDARY:
PRECMD=echo "  $(@F)" ; mkdir -p $(@D) ;

EGG_SDK:=../egg
ARCH:=linux

DST_ROM:=out/tooheavy.egg
SRC_ROM:=$(shell find src/www/js src/data -type f)
$(DST_ROM):$(SRC_ROM);$(PRECMD) $(EGG_SDK)/out/tool/eggrom -c -o$@ src/www/js src/data
all:$(DST_ROM)

DST_EXE:=out/$(ARCH)/tooheavy
LIBEGG:=$(EGG_SDK)/out/$(ARCH)/libegg-bundled.a
$(DST_EXE):$(DST_ROM) $(LIBEGG);$(PRECMD) $(EGG_SDK)/out/$(ARCH)/egg-bundle.sh -o$@ --rom=$(DST_ROM)
all:$(DST_EXE)

DST_HTML:=out/tooheavy.html
HTML_TEMPLATE:=$(EGG_SDK)/out/web/egg-headless.html
$(DST_HTML):$(DST_ROM) $(HTML_TEMPLATE);$(PRECMD) $(EGG_SDK)/out/tool/webtm -o$@ --html=$(HTML_TEMPLATE) --rom=$(DST_ROM)
all:$(DST_HTML)

run:$(DST_ROM);$(EGG_SDK)/out/linux/egg $(DST_ROM)

serve:$(DST_ROM);make --no-print-directory -C$(EGG_SDK) && $(EGG_SDK)/out/tool/server --port=8080 --htdocs=$(EGG_SDK)/src/web --rom=$(DST_ROM)

clean:;rm -rf mid out
