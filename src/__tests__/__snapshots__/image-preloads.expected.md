# Step 0

```html
Embedded App.
<script src="/external.js?value=a">
</script>
<link
  rel="preload"
  as="image"
  href="/external-a.gif"
>
<link
  rel="preload"
  as="image"
  imagesrcset="/external-b.gif 480w, /external-c.gif 800w"
  imagesizes="(max-width: 600px) 480px, 800px"
>
```

```html
Embedded App.
<script src="/external.js?value=a">
</script>
<link
  rel="preload"
  as="image"
  imagesrcset="/external-b.gif 480w, /external-c.gif 800w"
  imagesizes="(max-width: 600px) 480px, 800px"
>
```

```html
Embedded App.
<script src="/external.js?value=a">
</script>
<link
  rel="preload"
  as="image"
  imagesrcset="/external-b.gif 480w, /external-c.gif 800w"
  imagesizes="(max-width: 600px) 480px, 800px"
>
<img src="/external-a.gif">
<img
  srcset="/external-b.gif 480w, /external-c.gif 800w"
  sizes="(max-width: 600px) 480px, 800px"
  src="/external-d.gif"
>
After blocking.
```

```html
Embedded App.
<script src="/external.js?value=a">
</script>
<img src="/external-a.gif">
<img
  srcset="/external-b.gif 480w, /external-c.gif 800w"
  sizes="(max-width: 600px) 480px, 800px"
  src="/external-d.gif"
>
After blocking.
```

