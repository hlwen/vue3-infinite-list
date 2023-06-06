<template>
  <CtrlBar v-model="debug"
    :link="'https://github.com/tnfe/vue3-infinite-list/blob/master/demo/components/demo/Demo1.vue'" />

  <div class="vl-con">
    <InfiniteList :pullingDown="loadRefresh" :pullingUp="loadMore" :data="data.list" :width="'100%'" :height="700"
      :itemSize="50" :debug="debug" v-slot="{ item, index }">
      <div class="li-con">{{ index + 1 }} : {{ item }}</div>
      <div class="li-con">{{ item }}</div>
      <div class="li-con">{{ item }}</div>
      <div class="li-con">{{ item }}</div>
      <div class="li-con">{{ item }}</div>
      <div class="li-con">{{ item }}</div>
      <div class="li-con">{{ item }}</div>
      <div class="li-con">{{ item }}</div>
    </InfiniteList>
  </div>
</template>

<script lang="ts">
import { ref, reactive, defineComponent } from "vue";
import InfiniteList from "../../../src/";
import CommonService from "./common.service";
import CtrlBar from "./CtrlBar.vue";

export default defineComponent({
  name: "Demo1",
  components: {
    InfiniteList,
    CtrlBar,
  },
  setup() {
    const debug = ref(false);
    const data = reactive({ list: [] })

    return {
      debug,
      data,
      loadRefresh: () => {
        return new Promise((resolve,reject)=>{
          setTimeout(()=>{
            data.list = CommonService.generateData(11)
            resolve()
          },1000)
          
        })
        
      },
      loadMore: () => {
        return new Promise((resolve,reject)=>{
          setTimeout(()=>{
            data.list = [...data.list, ...CommonService.generateData(10)]
            resolve()
          },1000)
          
        })
       
      }
    };
  },
});
</script>

<style scoped>
@import "./common.css";
</style>
