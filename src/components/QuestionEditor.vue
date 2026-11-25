<script setup>
const props = defineProps({ questions: Array })
const add = () => props.questions.push({ text: '', options: ['', '', '', ''], correct: 0 })
const del = (i) => props.questions.splice(i, 1)
</script>
<template>
  <div class="editor">
    <div v-for="(q, i) in questions" :key="i" class="q">
      <div class="row">
        <b>{{ i + 1 }}.</b>
        <input class="input" v-model="q.text" placeholder="Question text" />
        <button class="btn small secondary" @click="del(i)">✕</button>
      </div>
      <label v-for="(o, k) in q.options" :key="k" class="opt">
        <input type="radio" :name="'c' + i" :value="k" v-model="q.correct" />
        <input class="input" v-model="q.options[k]" :placeholder="'Option ' + 'ABCD'[k]" />
      </label>
    </div>
    <button class="btn small" @click="add">+ Add question</button>
    <p class="muted hint">Select the radio button next to the correct answer. Options are shuffled automatically when the race starts.</p>
  </div>
</template>
<style scoped>
.q { border-bottom: 1px solid #333; padding: 10px 0 14px; }
.row { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
.opt { display: flex; gap: 8px; align-items: center; margin: 4px 0 4px 20px; }
.opt .input, .row .input { padding: 8px; font-size: .95rem; }
.opt input[type='radio'] { accent-color: #dc0000; width: 20px; height: 20px; }
.hint { margin-top: 8px; font-size: .9rem; }
</style>
