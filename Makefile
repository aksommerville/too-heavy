all:
.SILENT:
.SECONDARY:
PRECMD=echo "  $(@F)" ; mkdir -p $(@D) ;

run:;http-server -a localhost -p 8080 -c-1 -s1 src
