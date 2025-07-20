#!/bin/bash

hugo --gc
hugo build 
hugo server -D