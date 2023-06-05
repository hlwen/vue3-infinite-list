<style lang="scss">
.scroll {
  width: 100%;
  height: 100%;
  overflow: hidden;
  box-sizing: border-box;
  position: relative;

  &__wrapper {
    position: relative;
    z-index: 1;
  }

  &__pullup {
    width: 100%;
    height: 50px;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 14px;
    color: rgb(153, 153, 153);
  }

  &__pulldown {
    position: absolute;
    left: 0;
    top: -50px;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    transition: all;
    font-size: 14px;
    color: rgb(153, 153, 153);

    &__before {
      display: flex;
    }

    &__after {
      width: 100%;
      height: 40px;
      /* no */
      display: flex;
      justify-content: center;
      align-items: center;
    }
  }
}
</style>
<template>
  <div ref="rootNode" class="scroll-wrapper" :style="{ ...warpStyle }">

    <div class="content">
      <div ref="innerNode" :style="innerStyle"></div>

      <div v-for="(item, i) in event?.items" v-el-size="elSizes" :style="getItemStyle(i)" :key="event?.start + i"
        class="vue3-infinite-list" :class="[itemClass]">
        <slot :event="event" :item="item" :index="event.start + i"></slot>
      </div>
      <slot :pullDown="pullDown" :pullDownStyle="state.pullDownStyle" :pullDownBefore="state.pullDownBefore"
        :pullDownNow="state.pullDownNow" :bubbleY="state.bubbleY" name="pulldown">
        <div v-if="pullDown" ref="pulldown" :style="state.pullDownStyle" :class="c('__pulldown')">
          <div v-if="state.pullDownBefore" :class="c('__pulldown__before')">
            <Bubble :y="state.bubbleY" />
          </div>
          <div v-else :class="c('__pulldown__after')">
            <div v-if="state.pullDownNow">
              <Loading />
            </div>
            <div v-else><span>{{ pullDownTxt }}</span></div>
          </div>
        </div>
      </slot>

      <div :style="endStyle"></div>
      <slot :pullUp="pullUp" :pullUpNow="state.pullUpNow" name="pullup">
        <div v-if="pullUp" :class="c('__pullup')">
          <div v-if="!state.pullUpNow">
            <span>{{ pullUpTxt }}</span>
          </div>
          <div v-else>
            <Loading />
          </div>
        </div>
      </slot>
    </div>


  </div>
</template>

<script lang="ts">
import mixin from './mixins'
import {
  defineComponent,
  watch,
  ref,
  reactive,
  toRaw,
  toRefs,
  onMounted,
  onBeforeUnmount,
  onUpdated,
  computed,
  nextTick
} from "vue";

import {
  ALIGN_AUTO,
  ALIGN_CENTER,
  ALIGN_END,
  ALIGN_START,
  DIRECTION,
  DIRECTION_VERTICAL,
  DIRECTION_HORIZONTAL,
  SCROLL_CHANGE_REASON,
  SCROLL_CHANGE_OBSERVED,
  SCROLL_CHANGE_REQUESTED,
  STYLE_WRAPPER,
  STYLE_INNER,
  STYLE_ITEM,
  positionProp,
  scrollProp,
  sizeProp,
} from "./constants";

import { ItemStyle, StyleCache, ItemInfo, RenderedRows } from "./infinite-list.interface";
import { SizeAndPosManager, ItemSize } from "./size-and-position-manager";
import { Util } from "./utils";
import { ILEvent } from "./il-event";
import BScroll from '@better-scroll/core'
import Pullup from '@better-scroll/pull-up'
import PullDown from '@better-scroll/pull-down'
import Loading from './Loading/index.vue'
import Bubble from './Bubble/index.vue'
import { timeout } from './utils'
// 注册插件
BScroll.use(Pullup)
BScroll.use(PullDown)


export default {
  name: "InfiniteList",
  mixins: [mixin],
  components: {
    Loading,
    Bubble,
  },
  props: {
    scrollDirection: {
      type: String,
      default: DIRECTION_VERTICAL,
    },
    scrollToAlignment: {
      type: String,
      default: ALIGN_AUTO,
    },
    overscanCount: {
      type: Number,
      default: 4,
    },
    itemSize: {
      type: null,
      required: true,
    },
    data: {
      type: [Array, Boolean],
      default: [],
      required: true,
    },
    pullingUp: {
      type: Function,
      default() {
        return () => { }
      }
    },
    pullingDown: {
      type: Function,
      default() {
        return () => { }
      }
    },
    unit: {
      type: String,
      default: "px",
    },
    itemClass: {
      type: [String,Array],
      default: "",
    },
    width: {
      type: [Number, String],
    },
    height: {
      type: [Number, String],
    },
    debug: {
      type: Boolean,
      default: false,
    },
    scrollOffset: Number,
    scrollToIndex: Number,
    estimatedItemSize: Number,
    startY: {
      // 起始Y位置
      type: Number,
      default: 0,
    },
    bounce: {
      // 回弹效果
      type: Boolean,
      default: true,
    },
    bounceTime: {
      // 回弹时间
      type: Number,
      default: 600,
    },
    probeType: {
      // 滚动事件监听类型
      type: Number,
      default: 1,
    },
    click: {
      // 开启点击事件代理
      type: Boolean,
      default: true,
    },
    listenScroll: {
      // 监听滚动
      type: Boolean,
      default: false,
    },
    listenBeforeScrollStart: {
      // 监听滚动开始前
      type: Boolean,
      default: false,
    },
    scrollX: {
      // 开启X轴滚动
      type: Boolean,
      default: false,
    },
    scrollY: {
      // 开启Y轴滚动
      type: Boolean,
      default: true,
    },
    scrollbar: {
      // 开启滚动条
      type: null,
      default: false,
    },
    pullDown: {
      // 启用下拉刷新
      type: Boolean,
      default: true,
    },
    pullDownConfig: {
      // 下拉刷新配置
      type: Object,
      default: () => ({
        threshold: 100, // 触发 pullingDown 的距离
        stop: 60, // pullingDown 正在刷新 hold 时的距离
        txt: '刷新成功',
      }),
    },
    pullUp: {
      // 启用上拉加载
      type: Boolean,
      default: true,
    },
    pullUpConfig: {
      // 上拉加载配置
      type: Object,
      default: () => ({
        threshold: 100, // 提前触发 pullingUp 的距离
        txt: { more: '上拉加载', noMore: '— 我是有底线的 —' },
      }),
    },
  },
  directives: {
    // 在模板中启用 v-focus
    elSize: {
      // 当被绑定的元素插入到 DOM 中时……
      mounted(el, binding, vnode, prevVnode) {
        const elResize = () => {
          if (!binding.value[vnode.key]) {
            binding.value[vnode.key] = {
            }
          }
          if (el.clientHeight && el.clientWidth) {
            binding.value[vnode.key].height = el.clientHeight;
            binding.value[vnode.key].width = el.clientWidth;
          }
          // console.log(vnode.key, el.clientWidth,el.clientHeight)
        };
        const objResizeObserver = new ResizeObserver(elResize);
        elResize();
        // 观察文本域元素
        objResizeObserver.observe(el);
        const observer = new IntersectionObserver(
          (entries) => {
            if (!binding.value[vnode.key]) {
              binding.value[vnode.key] = {}
            }
            let entrie = entries[0]
            // console.log(vnode.key,entrie)
            let top = entrie.intersectionRect.top - entrie.rootBounds.top
            let bottom = entrie.rootBounds.bottom - entrie.intersectionRect.bottom
            binding.value[vnode.key].offset = top;
            binding.value[vnode.key].isIntersecting = top >= 0 && bottom <= entrie.rootBounds.height;
            // console.log(vnode.key, binding.value[vnode.key].isIntersecting, top, bottom, entrie.rootBounds.height)
          },
          {
            root: el.parentNode,
            rootMargin: '0px',
            threshold: [0, 1],
          },
        )
        observer.observe(el)
      },
      unmounted(el, binding, vnode, prevVnode) {
        // console.log('unmounted',vnode.key,binding.value[vnode.key])
        // binding.value[vnode.key].isIntersecting = false
      }
    }
  },
  setup(props, { attrs, slots, emit }) {
    let rootNode = ref(null);
    let innerNode = ref(null);
    // let warpStyle = ref(null);
    let elSizes = reactive({});
    let state = reactive({
      pullDownBefore: true, // 下拉之前
      pullDownNow: false, // 正在下拉
      pullDownStyle: '', // 下拉样式
      pullUpNow: false, // 正在上拉
      pullUpFinally: false, // true表示到了上拉加载到了最底部
      isRebounding: false, // 正在回弹
      bubbleY: 0, // 气泡y坐标
      pullDownInitTop: 0
    });

    let offset: number;
    let oldOffset: number;
    let scrollChangeReason: string;
    let sizeAndPosManager: SizeAndPosManager;
    let styleCache: StyleCache = {};

    const { itemSize, scrollDirection, scrollToIndex } = toRefs(props);
    const util = new Util();
    const event = reactive(new ILEvent());

    const getItemStyle = (index: number): any => {
      index += event.start;
      const style = styleCache[index];
      if (style) return style;

      // const { size, offset } = sizeAndPosManager.getSizeAndPositionForIndex(index);
      const debugStyle = props.debug ? { backgroundColor: util.randomColor() } : null;

      return (styleCache[index] = {
        // ...STYLE_ITEM,
        ...debugStyle,
        // height: (Math.floor(Math.random() * 100) + 50) + 'px'
        // [getCurrSizeProp()]: addUnit(size),
        // [positionProp[props.scrollDirection]]: addUnit(offset),
      });
    };
    let bs = ''
    // 初始化上拉加载
    const _initPullUp = () => {
      bs.on('pullingUp', async () => {

        state.pullUpNow = true
        state.pullUpFinally = true
        await props.pullingUp()
        bs.finishPullUp()

        state.pullUpNow = false

        state.pullUpFinally = false
        nextTick(() => {
          bs.refresh()
        })

      })
    }
    // 初始化下拉刷新
    const _initPullDown = () => {
      bs.on('pullingDown', async (e) => {
        state.pullDownBefore = false
        state.pullDownNow = true
        await props.pullingDown()
        state.isRebounding = true
        state.pullDownNow = false
        await timeout(props.bounceTime)
        state.isRebounding = false
        bs.finishPullDown()

        nextTick(() => {
          bs.refresh()
        })
      })

      bs.on('scroll', e => {
        if (!props.pullDown || e.y < 0) return

        const posY = Math.floor(e.y) // 滚动的y轴位置：Number

        if (state.pullDownBefore) {
          state.bubbleY = Math.max(0, posY + state.pullDownInitTop)
          state.pullDownStyle = `transform: translateY(${Math.min(posY, -state.pullDownInitTop)}px)`
        } else {
          state.bubbleY = 0
        }

        if (state.isRebounding) {
          state.pullDownStyle = `transform: translateY(${Math.min(posY, props.pullDownConfig.stop)}px)`
        }
      })
    }
    const initAll = () => {
      renderEnd()

      createSizeAndPosManager();
      // util.addEventListener(rootNode.value, "scroll", handleScroll);
      bs = new BScroll(rootNode.value, {
        ...props.betterScrollOptions,
        probeType: props.probeType,
        click: props.click,
        scrollX: props.scrollX,
        scrollY: props.scrollY,
        scrollbar: props.scrollbar,
        pullDownRefresh: props.pullDown && props.pullDownConfig,
        pullUpLoad: props.pullUp && props.pullUpConfig,
        startY: props.startY,
        bounce: props.bounce,
        bounceTime: props.bounceTime,
        preventDefaultException: props.preventDefaultException,
        mouseWheel: props.mouseWheel,

      })
      props.pullDown && _initPullDown()
      props.pullUp && _initPullUp()
      let y = 0
      let t = ''
      let wait = 100
      let previous = 0
      bs.on('scroll', (e) => {
        if (!state.pullDownBefore && !state.pullDownNow && e.y < 0) {
          state.pullDownBefore = true
        }
        // 限流
        if (Math.abs(e.y - y) > 20 && !state.pullDownNow && !state.pullUpNow) {
          console.log(111111)
          const now = +new Date(),
            remaining = wait - (now - previous)

          if (remaining <= 0) {
            if (t) {
              clearTimeout(t)
              t = ''
            }
            e.y < 0 && handleScroll(0 - e.y)
          }
          if (!t) {

            t = setTimeout(() => {
              clearTimeout(t)
              t = ''
              previous = +new Date();
              console.log(111111222)

              y = e.y
              e.y < 0 && handleScroll(0 - e.y)
            }, remaining)
          }



        }
      })
      // set offset init value
      offset = props.scrollOffset || (props.scrollToIndex != null && getOffsetForIndex(props.scrollToIndex)) || 0;
      scrollChangeReason = SCROLL_CHANGE_REQUESTED;

      // srcoll init value
      setTimeout(() => {
        if (props.scrollOffset != null) {
          scrollTo(props.scrollOffset);
        } else if (props.scrollToIndex != null) {
          scrollTo(getOffsetForIndex(props.scrollToIndex));
        }
      }, 0);

      //emit("update", event);
      scrollRender();
    };
    let isShaking = false
    const handleScroll = (y) => {
      if (isShaking) {
        return
      }
      const nodeOffset = getNodeOffset();
      // if (nodeOffset < 0 || offset === nodeOffset || e.target !== rootNode.value) return;

      // offset = e //nodeOffset;
      scrollChangeReason = SCROLL_CHANGE_OBSERVED;
      isShaking = true

      scrollRender();
      isShaking = false
      nextTick(() => {
        bs.refresh()
      })

    };

    const scrollRender = () => {

      // let visibleList = Object.keys(elSizes).filter(i => elSizes[i].isIntersecting).sort((a, b) => a - b)
      // // console.log(visibleList,visibleList[0])

      // let start = parseInt(visibleList[0]) - 4
      // if (start <= 0) {
      //   start = 0
      // }
      // let stop = parseInt(visibleList[visibleList.length - 1]) + 4
      // if (!visibleList.length) {
      //   start = 0
      //   stop = 10
      // }
      // if(stop>= props.data.length -1){
      //   stop = props.data.length -1
      // }

      const { start, stop } = sizeAndPosManager.getVisibleRange({
        containerSize: getCurrSizeVal() || 0,
        offset: 0 - bs.y || 0,
        overscanCount: props.overscanCount,
      });


      // console.log('offset,start,stop',offset,start,stop)

      // fill items;
      if (typeof start !== "undefined" && typeof stop !== "undefined") {
        let items = [];
        // console.log(stop)
        for (let i = start; i <= stop; i++) {
          items.push(props.data[i]);
        }

        event.start = start;
        event.stop = stop;
        event.offset = offset;
        event.items = items;
        event.total = getItemCount();

        // if (!util.isPureNumber(itemSize.value)) {
        //   innerStyle.value = {
        //     ...STYLE_INNER,
        //     [getCurrSizeProp()]: addUnit(sizeAndPosManager.getTotalSize()),
        //   };
        // }

        //emit("update", event);
        if (props.debug) {
          console.log(event.toString());
        }
      }

      renderEnd();
    };
    let innerStyle = computed(() => {
      if (!event?.start) {
        return {}
      }
      let size = 0
      for (let i = 0; i < event?.start; i++) {
        size += elSizes[i] ? elSizes[i].height : averageSize
      }
      return {
        ...STYLE_INNER,
        [getCurrSizeProp()]: addUnit(size),
      };
    });
    let endStyle = computed(() => {
      if (!props.data.length) {
        return {
          ...STYLE_INNER,
          [getCurrSizeProp() === 'height' ? 'minHeight' : 'minWidth']: addUnit(props.height)
        }
      }
      let size = 0
      for (let i = event?.stop + 1; i < props.data.length; i++) {
        size += elSizes[i] ? elSizes[i].height : averageSize
      }
      return {
        ...STYLE_INNER,
        [getCurrSizeProp()]: addUnit(size),
      };
    });

    const scrollTo = (value: number) => {
      rootNode.value[getCurrScrollProp()] = value;
      oldOffset = value;
    };
    let averageSize = 0
    const renderEnd = () => {
      if (oldOffset !== offset && scrollChangeReason === SCROLL_CHANGE_REQUESTED) {
        scrollTo(offset);
      }
      function avg(array: number): number {//封装求平均值函数
        var len = array.length;
        var sum = 0;
        for (var i = 0; i < len; i++) {
          sum += array[i];
        }
        return sum / len;
      }
      averageSize = avg(Object.keys(elSizes).filter(i => elSizes[i].height).map(i => elSizes[i].height))
    };

    ////////////////////////////////////////////////////////////////////////////
    // helper method
    ////////////////////////////////////////////////////////////////////////////
    // init SizeAndPosManager
    const createSizeAndPosManager = () => {
      if (!sizeAndPosManager)
        sizeAndPosManager = new SizeAndPosManager({
          itemCount: getItemCount(),
          itemSizeGetter: (index) => getSize(index),
          estimatedItemSize: getEstimatedItemSize(),
        });

      return sizeAndPosManager;
    };

    const getNodeOffset = () => {
      return rootNode.value[getCurrScrollProp()];
    };

    const getCurrSizeProp = () => {
      return sizeProp[scrollDirection.value];
    };

    const getCurrSizeVal = () => {
      return props[getCurrSizeProp()];
    };

    const getCurrScrollProp = () => {
      return scrollProp[scrollDirection.value];
    };

    const getOffsetForIndex = (
      index: number,
      scrollToAlignment: string = props.scrollToAlignment,
      itemCount: number = getItemCount()
    ): number => {
      if (index < 0 || index >= itemCount) index = 0;

      return sizeAndPosManager.getUpdatedOffsetForIndex({
        align: props.scrollToAlignment,
        containerSize: getCurrSizeVal(),
        currentOffset: offset || 0,
        targetIndex: index,
      });
    };

    const getSize = (index: number): number => {
      if (typeof itemSize.value === "function") {
        return itemSize.value(index);
      }
      let size = elSizes[index] ? elSizes[index].height : averageSize
      if (size) {
        return size
      }
      return util.isArray(itemSize.value) ? itemSize.value[index] : itemSize.value;
    };

    const getItemCount = (): number => {
      return props.data ? props.data.length : 0;
    };
    const getEstimatedItemSize = () => {
      return props.estimatedItemSize || (typeof itemSize.value === "number" && itemSize.value) || 50;
    };

    const recomputeSizes = (startIndex: number = 0) => {
      styleCache = {};
      sizeAndPosManager?.resetItem(startIndex);
    };

    const addUnit = (val: any): string => {
      return typeof val === "string" ? val : val + props.unit;
    };

    // const setDomStyle = () => {
    //   warpStyle.value = {
    //     ...STYLE_WRAPPER,

    //     height: addUnit(props.height),
    //     width: addUnit(props.width),
    //   };
    //   // innerStyle.value = {
    //   //   ...STYLE_INNER,
    //   //   [getCurrSizeProp()]: addUnit(sizeAndPosManager.getTotalSize()),
    //   // };
    // };
    const warpStyle = computed(() => {
      return {
        ...STYLE_WRAPPER,

        height: addUnit(props.height),
        width: addUnit(props.width),
      }
    })
    const clearStyleCache = () => {
      for (let key in styleCache) {
        delete styleCache[key];
      }
    };

    ////////////////////////////////////////////////////////////////////////////
    // The life cycle
    ////////////////////////////////////////////////////////////////////////////
    onMounted(async () => {
      if (props.pullingDown) {
        // await props.pullingDown()
      }
      let items = [];
      let stop = props.data.length >= 10 ? 10 : props.data.length
      for (let i = 0; i < stop; i++) {
        items.push(props.data[i]);
      }
      event.items = items;
      nextTick(initAll);
    })
    onBeforeUnmount(() => {
      clearStyleCache();
      sizeAndPosManager?.destroy();
      util.removeEventListener(rootNode.value, "scroll", handleScroll);
      bs && bs.destroy()
    });

    watch(
      () => props.debug,
      (newVal, oldVal) => clearStyleCache()
    );

    watch(
      () => props.data,
      (newVal, oldVal) => {
        sizeAndPosManager?.updateConfig({
          itemCount: getItemCount(),
          estimatedItemSize: getEstimatedItemSize(),
        });
        oldOffset = null;
        recomputeSizes();
        setTimeout(scrollRender, 0);
      }
    );

    watch(
      () => props.scrollOffset,
      (newVal, oldVal) => {
        offset = props.scrollOffset || 0;
        scrollChangeReason = SCROLL_CHANGE_REQUESTED;
        scrollRender();
      }
    );

    watch(
      () => props.scrollToIndex,
      (newVal, oldVal) => {
        offset = getOffsetForIndex(props.scrollToIndex, props.scrollToAlignment, getItemCount());
        scrollChangeReason = SCROLL_CHANGE_REQUESTED;
        scrollRender();
      }
    );
    // 下拉的文本
    const pullDownTxt = computed(() => {
      return props.pullDownConfig && props.pullDownConfig.txt
    })
    // 上拉的文本
    const pullUpTxt = computed(() => {
      const moreTxt = props.pullUpConfig && props.pullUpConfig.txt && props.pullUpConfig.txt.more

      const noMoreTxt = props.pullUpConfig && props.pullUpConfig.txt && props.pullUpConfig.txt.noMore

      return state.pullUpFinally ? noMoreTxt : moreTxt
    })
    return {
      rootNode,
      innerNode,
      warpStyle,
      innerStyle,
      endStyle,
      getItemStyle,
      event,
      elSizes,
      state,
      pullUpTxt,
      pullDownTxt
    };
  },
};
</script>
