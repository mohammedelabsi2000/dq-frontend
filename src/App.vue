<script setup lang="ts">
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
</script>

<template>
  <RouterView />
  <!-- أسفل الشاشة حتى لا يغطي الإشعار زر إغلاق النوافذ -->
  <Toast position="bottom-left" />
  <ConfirmDialog :style="{ width: '28rem' }" :breakpoints="{ '640px': '92vw' }" />
</template>
