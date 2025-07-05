# Step 0

```html
Embedded App.
<script>
  window.inlineScriptValues = []
</script>
<link
  rel="stylesheet"
  href="/external.css?color=rgb(255, 0, 0)"
>
<link
  href="/external.css?color=rgb(0, 255, 0)"
  rel="preload"
  as="style"
>
<link
  href="/external.css?color=rgb(0, 0, 255)"
  rel="preload"
  as="style"
>
```

```html
Embedded App.
<script>
  window.inlineScriptValues = []
</script>
<link
  rel="stylesheet"
  href="/external.css?color=rgb(255, 0, 0)"
>
<link
  href="/external.css?color=rgb(0, 255, 0)"
  rel="preload"
  as="style"
>
<link
  href="/external.css?color=rgb(0, 0, 255)"
  rel="preload"
  as="style"
>
<script>
  inlineScriptValues.push(getComputedStyle(document.body).color);
</script>
<link
  rel="stylesheet"
  href="/external.css?color=rgb(0, 255, 0)"
>
```

```html
Embedded App.
<script>
  window.inlineScriptValues = []
</script>
<link
  rel="stylesheet"
  href="/external.css?color=rgb(255, 0, 0)"
>
<link
  href="/external.css?color=rgb(0, 0, 255)"
  rel="preload"
  as="style"
>
<script>
  inlineScriptValues.push(getComputedStyle(document.body).color);
</script>
<link
  rel="stylesheet"
  href="/external.css?color=rgb(0, 255, 0)"
>
<script>
  inlineScriptValues.push(getComputedStyle(document.body).color);
</script>
<link
  rel="stylesheet"
  href="/external.css?color=rgb(0, 0, 255)"
>
```

```html
Embedded App.
<script>
  window.inlineScriptValues = []
</script>
<link
  rel="stylesheet"
  href="/external.css?color=rgb(255, 0, 0)"
>
<script>
  inlineScriptValues.push(getComputedStyle(document.body).color);
</script>
<link
  rel="stylesheet"
  href="/external.css?color=rgb(0, 255, 0)"
>
<script>
  inlineScriptValues.push(getComputedStyle(document.body).color);
</script>
<link
  rel="stylesheet"
  href="/external.css?color=rgb(0, 0, 255)"
>
<script>
  inlineScriptValues.push(getComputedStyle(document.body).color);
</script>
After blocking.
```

# Step 1

```html
Embedded App.
<script>
  window.inlineScriptValues = []
</script>
<link
  rel="stylesheet"
  href="/external.css?color=rgb(255, 0, 0)"
>
<script>
  inlineScriptValues.push(getComputedStyle(document.body).color);
</script>
<link
  rel="stylesheet"
  href="/external.css?color=rgb(0, 255, 0)"
>
<script>
  inlineScriptValues.push(getComputedStyle(document.body).color);
</script>
<link
  rel="stylesheet"
  href="/external.css?color=rgb(0, 0, 255)"
>
<script>
  inlineScriptValues.push(getComputedStyle(document.body).color);
</script>
After blocking.
```

