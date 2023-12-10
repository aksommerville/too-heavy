all:
.SILENT:
.SECONDARY:
PRECMD=echo "  $(@F)" ; mkdir -p $(@D) ;

# Plain old http-server is fine for the game, any static HTTP server will do.
# But for the editor we need something slightly fancier.
#run:;http-server -a localhost -p 8080 -c-1 -s1 src

run:;node src/server/main.js
