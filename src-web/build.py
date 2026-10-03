import sys
src=open('app.src.html').read(); core=open('core.js').read()
assert '/*CORE*/' in src and '<!--LIBS-->' in src
web_libs='''<script src="https://cdn.jsdelivr.net/npm/alasql@4.19.1/dist/alasql.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.12.3/dist/JsBarcode.all.min.js"></script>'''
app_libs='''<script src="alasql.min.js"></script>
<script src="zxing.min.js"></script>
<script src="JsBarcode.all.min.js"></script>'''
base=src.replace('/*CORE*/',core)
open('noor-web.html','w').write(base.replace('<!--LIBS-->',web_libs))
open('noor-app.html','w').write(base.replace('<!--LIBS-->',app_libs))
print('built', len(base))
