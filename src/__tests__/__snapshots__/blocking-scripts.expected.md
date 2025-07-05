# Step 0

```html
Embedded App.
<script>
  window.inlineScriptValues = []
</script>
<script src="/external.js?value=a">
</script>
<link
  href="/external.js?value=b"
  rel="preload"
  as="script"
>
<link
  href="/external.js?value=c"
  rel="preload"
  as="script"
>
```

```html
Embedded App.
<script>
  window.inlineScriptValues = []
</script>
<script src="/external.js?value=a">
</script>
<link
  href="/external.js?value=b"
  rel="preload"
  as="script"
>
<link
  href="/external.js?value=c"
  rel="preload"
  as="script"
>
<script>
  inlineScriptValues.push(0, scriptValues.at(-1));
</script>
<script src="/external.js?value=b">
</script>
```

```html
Embedded App.
<script>
  window.inlineScriptValues = []
</script>
<script src="/external.js?value=a">
</script>
<link
  href="/external.js?value=c"
  rel="preload"
  as="script"
>
<script>
  inlineScriptValues.push(0, scriptValues.at(-1));
</script>
<script src="/external.js?value=b">
</script>
<script>
  inlineScriptValues.push(1, scriptValues.at(-1));
</script>
<script src="/external.js?value=c">
</script>
```

```html
Embedded App.
<script>
  window.inlineScriptValues = []
</script>
<script src="/external.js?value=a">
</script>
<script>
  inlineScriptValues.push(0, scriptValues.at(-1));
</script>
<script src="/external.js?value=b">
</script>
<script>
  inlineScriptValues.push(1, scriptValues.at(-1));
</script>
<script src="/external.js?value=c">
</script>
<script>
  inlineScriptValues.push(2, scriptValues.at(-1));
</script>
After blocking.
```

# Step 1

```html
Embedded App.
<script>
  window.inlineScriptValues = []
</script>
<script src="/external.js?value=a">
</script>
<script>
  inlineScriptValues.push(0, scriptValues.at(-1));
</script>
<script src="/external.js?value=b">
</script>
<script>
  inlineScriptValues.push(1, scriptValues.at(-1));
</script>
<script src="/external.js?value=c">
</script>
<script>
  inlineScriptValues.push(2, scriptValues.at(-1));
</script>
After blocking.
```

