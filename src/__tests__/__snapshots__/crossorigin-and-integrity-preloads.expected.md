# Step 0

```html
Embedded App.
<script src="/external.js?value=a">
</script>
<link
  href="/external.js?value=b"
  rel="preload"
  as="script"
  crossorigin="use-credentials"
>
<link
  href="/external.js?value=c"
  rel="preload"
  as="script"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
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
  crossorigin="use-credentials"
>
<link
  href="/external.js?value=c"
  rel="preload"
  as="script"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
>
<script
  src="/external.js?value=b"
  crossorigin="use-credentials"
>
</script>
```

```html
Embedded App.
<script src="/external.js?value=a">
</script>
<link
  href="/external.js?value=c"
  rel="preload"
  as="script"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
>
<script
  src="/external.js?value=b"
  crossorigin="use-credentials"
>
</script>
<script
  src="/external.js?value=c"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
>
</script>
```

```html
Embedded App.
<script src="/external.js?value=a">
</script>
<script
  src="/external.js?value=b"
  crossorigin="use-credentials"
>
</script>
<script
  src="/external.js?value=c"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
>
</script>
After blocking.
```

# Step 1

```html
Embedded App.
<script src="/external.js?value=a">
</script>
<script
  src="/external.js?value=b"
  crossorigin="use-credentials"
>
</script>
<script
  src="/external.js?value=c"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
>
</script>
After blocking.
```

