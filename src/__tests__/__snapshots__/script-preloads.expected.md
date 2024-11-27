# Step 0

```html
Embedded App.
<script src="/external.js?value=a">
</script>
<link
  href="/external.js?value=b"
  rel="preload"
  as="script"
>
<link
  href="/external.js?value=d"
  rel="modulepreload"
>
```

```html
Embedded App.
<script src="/external.js?value=a">
</script>
<link
  href="/external.js?value=b"
  rel="preload"
  as="script"
>
<link
  href="/external.js?value=d"
  rel="modulepreload"
>
<script
  src="/external.js?value=b"
  async
>
</script>
<script
  src="/external.js?value=c"
  nomodule
>
</script>
<script
  src="/external.js?value=d"
  type="module"
>
</script>
After blocking.
```

```html
Embedded App.
<script src="/external.js?value=a">
</script>
<link
  href="/external.js?value=b"
  rel="preload"
  as="script"
>
<script
  src="/external.js?value=b"
  async
>
</script>
<script
  src="/external.js?value=c"
  nomodule
>
</script>
<script
  src="/external.js?value=d"
  type="module"
>
</script>
After blocking.
```

```html
Embedded App.
<script src="/external.js?value=a">
</script>
<script
  src="/external.js?value=b"
  async
>
</script>
<script
  src="/external.js?value=c"
  nomodule
>
</script>
<script
  src="/external.js?value=d"
  type="module"
>
</script>
After blocking.
```

