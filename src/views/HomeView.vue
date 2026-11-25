<template>
  <main class="home">
    <div class="stripe"></div>
    <section class="hero">
      <p class="tag">University Presentation</p>
      <h1>Ferrari Racing</h1>
      <h2>The Ultimate Quiz</h2>
      <p class="lead">Answer correctly. Move forward. Cross the line first.</p>
      <div class="actions">
        <RouterLink to="/host" class="btn">I'm the Host</RouterLink>
        <RouterLink to="/play" class="btn secondary">Join a Race</RouterLink>
      </div>
    </section>
    <div class="stripe"></div>
  </main>
</template>
<style scoped>
.home { min-height: 100vh; display: flex; flex-direction: column; justify-content: space-between; }
.hero { text-align: center; padding: 40px 20px; }
.tag { color: var(--yellow); letter-spacing: 4px; text-transform: uppercase; font-weight: 700; }
h1 { font-size: clamp(2.5rem, 9vw, 6rem); font-weight: 900; color: var(--red); text-shadow: 0 0 40px rgba(220,0,0,.5); }
h2 { font-size: clamp(1rem, 3.5vw, 2rem); margin-bottom: 20px; }
.lead { color: var(--grey); margin-bottom: 36px; }
.actions { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
</style>
