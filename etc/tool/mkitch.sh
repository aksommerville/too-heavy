#!/bin/sh

if [ "$#" -ne 1 ] ; then
  echo "Usage: $0 OUTPUT"
  exit 1
fi

DSTPATH="$1"

mkdir -p mid/itchscratch
rm -fr mid/itchscratch/*
cp -r src/www/* mid/itchscratch
cp -r src/data mid/itchscratch
cd mid/itchscratch
zip -r itchscratch.zip *
cd ../..
cp mid/itchscratch/itchscratch.zip "$DSTPATH"
