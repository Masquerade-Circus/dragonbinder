import Dragonbinder from "../dist/dragonbinder.mjs";
import { expect } from "expect";

const dragonbinder = new Dragonbinder({
  state: { b: [1], a: 0, c: { a: 1 } },
  mutations: {
    pushB(state, payload) {
      state.b = [...state.b, payload];
    },
    deleteB(state) {
      delete state.b;
    },
    increment(state, payload) {
      state.a = state.a + payload;
    },
    changeC(state, payload) {
      state.c = Object.assign({}, state.c, { a: payload });
    },
    changeCDirectly(state, payload) {
      state.c.a = payload;
    }
  },
  actions: {
    pushB(context, payload) {
      return new Promise((resolve) => {
        setTimeout(() => {
          context.commit("pushB", payload);
          resolve();
        }, 1000);
      });
    }
  },
  getters: {
    length(state, getters) {
      return getters.items.length;
    },
    items(state, getters) {
      return state.b;
    }
  }
});

expect(dragonbinder.state.a).toBe(0);
dragonbinder.commit("increment", 1);
expect(dragonbinder.state.a).toBe(1);

expect(dragonbinder.getters.length).toBe(1);
dragonbinder.commit("pushB", 2);
expect(dragonbinder.getters.length).toBe(2);
