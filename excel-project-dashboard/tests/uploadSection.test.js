/**
 * UploadSection 跳转时机回归测试
 *
 * 背景（真实 Bug）：一次选 3 个台账时，若在每个 file-uploaded 里就 `router.push`，
 * 第一个文件成功即卸载本组件，后续文件的 file-uploaded 会被 Vue 丢弃
 * （emit 在 isUnmounted 的实例上直接 return），表现为「只导入了第一个台账」，
 * 成本管控页因此一直空着。跳转必须等整批结束（batch-done）。
 */
import { mount, flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, test } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import UploadSection from '../src/components/sections/UploadSection.vue';

const UploadAreaStub = {
  name: 'UploadArea',
  props: ['acceptType', 'title', 'description'],
  template: '<div class="upload-area-stub" />',
};

const makeRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/overview', name: 'overview', component: { template: '<div />' } },
      { path: '/data', name: 'data', component: { template: '<div />' } },
    ],
  });

const mountSection = async () => {
  const pinia = createPinia();
  setActivePinia(pinia);
  const router = makeRouter();
  await router.push('/data');
  await router.isReady();

  const wrapper = mount(UploadSection, {
    props: { section: { badge: 'A', title: '数据导入', tone: 'blue' } },
    global: { plugins: [pinia, router], stubs: { UploadArea: UploadAreaStub } },
  });

  return { wrapper, router, area: wrapper.findComponent(UploadAreaStub) };
};

describe('UploadSection 上传后跳转时机', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  test('逐个文件的 file-uploaded 不触发跳转', async () => {
    const { router, area } = await mountSection();

    area.vm.$emit('file-uploaded', { data: [{}], acceptType: 'business', fileName: 'a.xlsx' });
    area.vm.$emit('file-uploaded', { data: [{}], acceptType: 'contract', fileName: 'b.xlsx' });
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/data');
  });

  test('整批结束（batch-done）后才跳到概览', async () => {
    const { router, area } = await mountSection();

    area.vm.$emit('file-uploaded', { data: [{}], acceptType: 'business', fileName: 'a.xlsx' });
    area.vm.$emit('batch-done', { total: 3, successCount: 3 });
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/overview');
  });

  test('整批全部失败（successCount 0）时不跳转', async () => {
    const { router, area } = await mountSection();

    area.vm.$emit('batch-done', { total: 3, successCount: 0 });
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/data');
  });
});
