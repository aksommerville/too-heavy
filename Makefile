all:
.SILENT:
.SECONDARY:
PRECMD=echo "  $(@F)" ; mkdir -p $(@D) ;

# Plain old http-server is fine for the game, any static HTTP server will do.
# But for the editor we need something slightly fancier.
#run:;http-server -a localhost -p 8080 -c-1 -s1 src

run:;node src/server/main.js

# Bundle a ZIP file for Itch.io. Doesn't currently work, we need to sort out data files first.
#ITCHPKG:=out/too-heavy-web.zip
#WWWFILES:=$(shell find src/www -type f)
#DATAFILES:=$(shell find src/data -type f)
#$(ITCHPKG):$(WWWFILES) $(DATAFILES);$(PRECMD) etc/tool/mkitch.sh $(ITCHPKG)
#itch:$(ITCHPKG)

clean:;rm -rf mid out
