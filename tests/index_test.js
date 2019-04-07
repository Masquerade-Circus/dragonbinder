import test from 'ava';
import expect from 'expect';
import Dragonbinder from '../lib';

function getNewStore() {
  let mainModule = {
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
            context.commit('pushB', payload);
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
  };

  return new Dragonbinder(mainModule);
}

test('Create empty state if state is not passed', (t) => {
  let store = new Dragonbinder();
  expect(store.state).toBeDefined();
});

test('Use deepFrozen to froze the state', (t) => {
  let store = new Dragonbinder({
    state: {
      a: {
        b: {
          c: {
            d: null
          },
          d: null
        }
      }
    }
  });

  expect(Object.isFrozen(store.state.a.b.c.d)).toBeTruthy();
});

test('Throw error if you try to mutate the state directly', (t) => {
  let store = getNewStore();
  expect(() => (store.state.b = 1)).toThrowError('You need to commit a mutation to change the state');
});

test('Throw error if you try to mutate a deeper property of the state directly', (t) => {
  let store = getNewStore();
  expect(() => store.state.b.push(1)).toThrowError('Cannot add property 1, object is not extensible');
});

test('Throw error if you try to remove a property directly', (t) => {
  let store = getNewStore();
  expect(() => delete store.state.b).toThrowError('You need to commit a mutation to change the state');
});

test('Throw error if you try to remove a deeper property directly', (t) => {
  let store = getNewStore();
  expect(() => delete store.state.c.a).toThrowError("Cannot delete property 'a' of #<Object>");
});

test('Mutate the state by commit', (t) => {
  let store = getNewStore();
  expect(store.state.a).toEqual(0);
  store.commit('increment', 1);
  expect(store.state.a).toEqual(1);

  expect(store.state.b).toEqual([1]);
  store.commit('deleteB');
  expect(store.state.b).toBeUndefined();
});

test('Throw error if you try to commit an undefined mutation', (t) => {
  let store = getNewStore();
  expect(() => store.commit('hello')).toThrowError('The mutation "hello" does not exists.');
});

test('Mutate the state by dispatch', async (t) => {
  let store = getNewStore();
  expect(store.state.b).toEqual([1]);
  await store.dispatch('pushB', 2);
  expect(store.state.b).toEqual([1, 2]);
});

test('Throw error if you try to dispatch an undefined action', (t) => {
  let store = getNewStore();
  expect(() => store.dispatch('hello')).toThrowError('The action "hello" does not exists.');
});

test('Use a getter to obtain a property from the state', (t) => {
  let store = getNewStore();
  expect(store.getters.items).toEqual([1]);
});

test('Use a getter to obtain data using another getter', (t) => {
  let store = getNewStore();
  expect(store.getters.length).toEqual(1);
});

test('Fail silently if you try to get an undefined getter, getter must return undefined', (t) => {
  let store = getNewStore();
  expect(store.getters.ok).toBeUndefined();
});

test('Use plugins', (t) => {
  let store = new Dragonbinder();
  let params = [];
  let plugin = (...args) => {
    params.push(args);
  };
  store.use(plugin, 'option1', 'option2');
  store.use(plugin, 'option1', 'option2');
  expect(params).toEqual([
    [
      expect.any(Dragonbinder),
      'option1',
      'option2'
    ]
  ]);
});

test('Add a listener', (t) => {
  let store = getNewStore();
  let count = 0;
  let method = () => count++;
  expect(count).toEqual(0);
  store.on('set', method);
  store.on('delete', method);
  store.commit('increment', 1);
  store.commit('deleteB');
  expect(count).toEqual(2);
});

test('Remove a named listener', (t) => {
  let store = getNewStore();
  let count = 0;
  let method = () => count++;
  expect(count).toEqual(0);
  store.on('set', method);
  store.commit('increment');
  expect(count).toEqual(1);
  store.off('set', method);
  store.commit('increment');
  expect(count).toEqual(1);
});

test('Remove an anonymous method by returned remove callback', (t) => {
  let store = getNewStore();
  let count = 0;
  expect(count).toEqual(0);
  let removeListener = store.on('set', () => count++);
  store.commit('increment');
  expect(count).toEqual(1);
  removeListener();
  store.commit('increment');
  expect(count).toEqual(1);
});

test('Throw error if you try to listen with something other than a function', (t) => {
  let store = getNewStore();
  expect(() => store.on('set', 'hello')).toThrowError('You need to provide a valid function as listener.');
});

test('Throw error if you try to remove a listener that is something other than a function', (t) => {
  let store = getNewStore();
  expect(() => store.off('set', 'hello')).toThrowError('You need to provide a valid function as listener.');
});

test('Fail silently if you try to remove an already removed or not added listener', (t) => {
  let store = getNewStore();
  store.off('set', () => {});
});

test('Add a listener only once', (t) => {
  let store = getNewStore();
  let count = 0;
  let method = () => count++;
  expect(count).toEqual(0);
  store.on('set', method);
  store.on('set', method);
  store.on('set', method);
  store.commit('increment');
  expect(count).toEqual(1);
});

test('Test all listeners', async (t) => {
  let store = getNewStore();
  let events = [
    'addlistener',
    'removelistener',
    'set',
    'delete',
    'beforecommit',
    'commit',
    'beforedispatch',
    'dispatch',
    'getter',
    'plugin',
    'registerModule',
    'unregisterModule'
  ];
  let methods = events.reduce((methods, event) => {
    methods[event] = {
      params: [],
      method: (...params) => methods[event].params.push(params)
    };
    return methods;
  }, {});

  events.forEach(event => store.on(event, methods[event].method));
  store.getters.length;
  await store.dispatch('pushB', 1);
  store.commit('deleteB');
  let plugin = () => {};
  store.use(plugin);
  let module = {};
  store.registerModule('b', module);
  store.unregisterModule('b');
  events.forEach(event => store.off(event, methods[event].method));

  // Add listener event
  expect(methods.addlistener.params.length).toEqual(events.length);
  expect(methods.addlistener.params).toEqual(events.map(event => {
    return [
      expect.any(Dragonbinder), // The store
      event, // The listener name
      methods[event].method // The listener added
    ];
  }));

  // Remove listener event
  expect(methods.removelistener.params.length).toEqual(1);
  expect(methods.removelistener.params[0]).toEqual([
    expect.any(Dragonbinder), // The store
    'addlistener', // The listener name
    methods.addlistener.method // The listener added
  ]);


  // Set event also triggered when you register a module
  expect(methods.set.params.length).toEqual(2);
  expect(methods.set.params[0]).toEqual([
    expect.any(Dragonbinder), // The store
    'b', // The property name
    [1, 1], // The new value,
    [1] // The old value
  ]);

  // Delete event also triggered when you unregister a module
  expect(methods.delete.params.length).toEqual(2);
  expect(methods.delete.params[0]).toEqual([
    expect.any(Dragonbinder), // The store
    'b', // The property name
    [1, 1] // The old value
  ]);

  // Before commit event
  expect(methods.beforecommit.params.length).toEqual(2);
  expect(methods.beforecommit.params[0]).toEqual([
    expect.any(Dragonbinder), // The store
    'pushB', // The mutation name
    1 // The params passed to the mutation
  ]);

  // Commit event
  expect(methods.commit.params.length).toEqual(2);
  expect(methods.commit.params[0]).toEqual([
    expect.any(Dragonbinder), // The store
    'pushB', // The mutation name
    1 // The params passed to the mutation
  ]);

  // Before dispatch event,
  expect(methods.beforedispatch.params.length).toEqual(1);
  expect(methods.beforedispatch.params[0]).toEqual([
    expect.any(Dragonbinder), // The store
    'pushB', // The action name
    1 // The params passed to the mutation
  ]);

  // Dispatch event
  expect(methods.dispatch.params.length).toEqual(1);
  expect(methods.dispatch.params[0]).toEqual([
    expect.any(Dragonbinder), // The store
    'pushB', // The action name
    1 // The params passed to the mutation
  ]);

  // Getter event
  expect(methods.getter.params.length).toEqual(2);
  expect(methods.getter.params[0]).toEqual([
    expect.any(Dragonbinder), // The store
    'items', // The getter name
    [1] // The value of the getter
  ]);

  // Add plugin event
  expect(methods.plugin.params.length).toEqual(1);
  expect(methods.plugin.params[0]).toEqual([
    expect.any(Dragonbinder), // The store
    plugin // The plugin added
  ]);

  // Register module event
  expect(methods.registerModule.params.length).toEqual(1);
  expect(methods.registerModule.params[0]).toEqual([
    expect.any(Dragonbinder), // The store
    'b', // The namespace registered
    module, // The module definition
    expect.any(Dragonbinder) // The store created with the definition
  ]);

  // Unregister module event
  expect(methods.unregisterModule.params.length).toEqual(1);
  expect(methods.unregisterModule.params[0]).toEqual([
    expect.any(Dragonbinder), // The store
    'b', // The namespace unregistered
    expect.any(Dragonbinder) // The store created with the definition
  ]);
});

test('Register nested modules', () => {
  let store = getNewStore();
  store.registerModule('my.module', {
    state: {hello: 'world'},
    mutations: {
      change(state) {
        state.hello = 'mundo';
      }
    }
  });

  expect(store.init.modules).toEqual({
    'my.module': expect.any(Dragonbinder)
  });
  expect(store.state).toEqual(expect.objectContaining({
    'my.module': {
      hello: 'world'
    }
  }));
});

test('Throw an error if you want to overwrite a registered module', () => {
  let store = getNewStore();
  let myModule = {
    state: {hello: 'world'},
    mutations: {
      change(state) {
        state.hello = 'mundo';
      }
    }
  };

  store.registerModule('my.module', myModule);

  expect(() => store.registerModule('my.module', myModule))
    .toThrowError('A module with the namespace "my.module" is already registered.');
});

test('Unregister nested modules', () => {
  let store = getNewStore();
  store.registerModule('my.module', {
    state: {hello: 'world'},
    mutations: {
      change(state) {
        state.hello = 'mundo';
      }
    }
  });

  expect(store.init.modules).toEqual({
    'my.module': expect.any(Dragonbinder)
  });
  expect(store.state).toEqual(expect.objectContaining({
    'my.module': {
      hello: 'world'
    }
  }));

  store.unregisterModule('my.module');

  expect(store.init.modules).toEqual({});
  expect(store.state['my.module']).toBeUndefined();
});

test('Fail silently if you try to unregister a nested module twice', () => {
  let store = getNewStore();
  store.registerModule('my.module', {
    state: {hello: 'world'},
    mutations: {
      change(state) {
        state.hello = 'mundo';
      }
    }
  });

  expect(store.init.modules).toEqual({
    'my.module': expect.any(Dragonbinder)
  });
  expect(store.state).toEqual(expect.objectContaining({
    'my.module': {
      hello: 'world'
    }
  }));

  store.unregisterModule('my.module');
  store.unregisterModule('my.module');

  expect(store.init.modules).toEqual({});
  expect(store.state['my.module']).toBeUndefined();
});

test('Call a nested module mutation', () => {
  let store = getNewStore();
  store.registerModule('my.module', {
    state: {hello: 'world'},
    mutations: {
      change(state) {
        state.hello = 'mundo';
      }
    }
  });

  expect(store.state).toEqual(expect.objectContaining({
    'my.module': {
      hello: 'world'
    }
  }));

  store.commit('my.module.change');

  expect(store.state).toEqual(expect.objectContaining({
    'my.module': {
      hello: 'mundo'
    }
  }));
});

test('Throw error if try to call a mutation of a non existent module', () => {
  let store = getNewStore();
  store.registerModule('my.module', {
    state: {hello: 'world'},
    mutations: {
      change(state) {
        state.hello = 'mundo';
      }
    }
  });

  expect(() => store.commit('my.module.not.change'))
    .toThrowError('The module "my.module.not" does not exists.');
});

test('Throw error if mutation of a nested module does not exists', () => {
  let store = getNewStore();
  store.registerModule('my.module', {
    state: {hello: 'world'},
    mutations: {
      change(state) {
        state.hello = 'mundo';
      }
    }
  });

  expect(() => store.commit('my.module.not-change'))
    .toThrowError('The mutation "not-change" does not exists.');
});

test('Call a nested module action', async () => {
  let store = getNewStore();
  store.registerModule('my.module', {
    state: {hello: 'world'},
    mutations: {
      change(state) {
        state.hello = 'mundo';
      }
    },
    actions: {
      change(store) {
        store.commit('change');
      }
    }
  });

  expect(store.state).toEqual(expect.objectContaining({
    'my.module': {
      hello: 'world'
    }
  }));

  await store.dispatch('my.module.change');

  expect(store.state).toEqual(expect.objectContaining({
    'my.module': {
      hello: 'mundo'
    }
  }));
});

test('Call a root action and mutation from a nested module action', async () => {
  let store = getNewStore();
  store.registerModule('my.module', {
    actions: {
      async change(store, payload) {
        store.rootStore.commit('increment', payload);
        await store.rootStore.dispatch('pushB', payload);
      }
    }
  });

  expect(store.state).toEqual(expect.objectContaining({
    a: 0,
    b: [1]
  }));

  await store.dispatch('my.module.change', 5);

  expect(store.state).toEqual(expect.objectContaining({
    a: 5,
    b: [1, 5]
  }));
});

test('Throw error if try to call a action of a non existent module', () => {
  let store = getNewStore();
  store.registerModule('my.module', {
    state: {hello: 'world'},
    mutations: {
      change(state) {
        state.hello = 'mundo';
      }
    },
    actions: {
      change(store) {
        store.commit('change');
      }
    }
  });

  expect(() => store.dispatch('my.module.not.change'))
    .toThrowError('The module "my.module.not" does not exists.');
});

test('Throw error if action of a nested module does not exists', () => {
  let store = getNewStore();
  store.registerModule('my.module', {
    state: {hello: 'world'},
    mutations: {
      change(state) {
        state.hello = 'mundo';
      }
    },
    actions: {
      change(store) {
        store.commit('change');
      }
    }
  });

  expect(() => store.dispatch('my.module.not-change'))
    .toThrowError('The action "not-change" does not exists.');
});

test('Use a getter to obtain a property from the nested module state', (t) => {
  let store = getNewStore();
  store.registerModule('my.module', {
    state: {hello: 'world'},
    mutations: {
      change(state) {
        state.hello = 'mundo';
      }
    },
    getters: {
      entity(state, getters) {
        return state.hello;
      },
      capitalizedEntity(state, getters) {
        return getters.entity.charAt(0).toUpperCase() + getters.entity.slice(1);
      }
    }
  });
  expect(store.getters['my.module.entity']).toEqual('world');
});

test('Use a nested module getter to obtain data using another nested getter', (t) => {
  let store = getNewStore();
  store.registerModule('my.module', {
    state: {hello: 'world'},
    mutations: {
      change(state) {
        state.hello = 'mundo';
      }
    },
    getters: {
      entity(state, getters) {
        return state.hello;
      },
      capitalizedEntity(state, getters) {
        return getters.entity.charAt(0).toUpperCase() + getters.entity.slice(1);
      }
    }
  });
  expect(store.getters['my.module.capitalizedEntity']).toEqual('World');
});

test('Fail silently if you try to get an undefined nested module getter, getter must return undefined', (t) => {
  let store = getNewStore();
  store.registerModule('my.module', {
    state: {hello: 'world'},
    mutations: {
      change(state) {
        state.hello = 'mundo';
      }
    },
    getters: {
      entity(state, getters) {
        return state.hello;
      },
      capitalizedEntity(state, getters) {
        return getters.entity.charAt(0).toUpperCase() + getters.entity.slice(1);
      }
    }
  });
  expect(store.getters['my.module.capitalized']).toBeUndefined();
});

test('Fail silently if you try to get a getter of a non existent nested module', (t) => {
  let store = getNewStore();
  store.registerModule('my.module', {
    state: {hello: 'world'},
    mutations: {
      change(state) {
        state.hello = 'mundo';
      }
    },
    getters: {
      entity(state, getters) {
        return state.hello;
      },
      capitalizedEntity(state, getters) {
        return getters.entity.charAt(0).toUpperCase() + getters.entity.slice(1);
      }
    }
  });
  expect(store.getters['my.capitalized']).toBeUndefined();
  expect(store.getters['other.capitalized']).toBeUndefined();
});

test('Use a getter to obtain a property from the root state and root getters', (t) => {
  let store = getNewStore();
  store.registerModule('my.module', {
    state: {hello: 'world'},
    mutations: {
      change(state) {
        state.hello = 'mundo';
      }
    },
    getters: {
      length(state, getters, rootState, rootGetters) {
        return rootGetters.items.length;
      },
      items(state, getters, rootState, rootGetters) {
        return rootState.b;
      }
    }
  });
  expect(store.getters['my.module.length']).toEqual(1);
  expect(store.getters['my.module.items']).toEqual([1]);
});

test('Register nested modules with initial modules property', () => {
  let store = new Dragonbinder({
    modules: {
      'my.module': {
        state: {hello: 'world'},
        mutations: {
          change(state) {
            state.hello = 'mundo';
          }
        }
      }
    }
  });

  expect(store.init.modules).toEqual({
    'my.module': expect.any(Dragonbinder)
  });
  expect(store.state).toEqual(expect.objectContaining({
    'my.module': {
      hello: 'world'
    }
  }));
});

test('Register nested modules with initial modules property and with child nested modules', () => {
  let moduleA = {
    state: {hello: 'world'},
    mutations: {
      change(state) {
        state.hello = 'mundo';
      }
    }
  };

  let moduleB = {
    state: {hola: 'mundo'},
    mutations: {
      change(state) {
        state.hola = 'world';
      }
    },
    modules: {
      a: moduleA
    }
  };

  let store = new Dragonbinder({
    modules: {
      b: moduleB
    }
  });

  expect(store.init.modules).toEqual({
    b: expect.any(Dragonbinder),
    'b.a': expect.any(Dragonbinder)
  });
  expect(store.state).toEqual(expect.objectContaining({
    b: {
      hola: 'mundo'
    },
    'b.a': {
      hello: 'world'
    }
  }));
});

test('Trigger listener updating a nested module store', (t) => {
  let store = getNewStore();
  store.registerModule('my.module', {
    state: {hello: 'world'},
    mutations: {
      change(state) {
        state.hello = 'mundo';
      },
      deleteHello(state) {
        delete state.hello;
      }
    }
  });
  let count = 0;
  let method = () => count++;
  expect(count).toEqual(0);
  store.on('set', method);
  store.on('delete', method);
  store.commit('my.module.change');
  store.commit('my.module.deleteHello');
  expect(count).toEqual(2);
});

test('Trigger listeners within a child nested module', (t) => {
  let moduleA = {
    state: {hello: 'world'},
    mutations: {
      change(state) {
        state.hello = 'mundo';
      }
    }
  };

  let moduleB = {
    state: {hola: 'mundo'},
    mutations: {
      change(state) {
        state.hola = 'world';
      }
    },
    modules: {
      a: moduleA
    }
  };

  let store = new Dragonbinder({
    modules: {
      'my.module': moduleB
    }
  });

  let count = 0;
  let method = () => count++;
  expect(count).toEqual(0);
  store.on('set', method);
  store.commit('my.module.change');
  store.commit('my.module.a.change');
  expect(count).toEqual(2);
});

test('Declare state as factory function', (t) => {
  const myModule = {
    state() {
      return {
        count: 1
      };
    },
    mutations: {
      increment(state, payload) {
        state.count = state.count + payload;
      }
    }
  };

  const store1 = new Dragonbinder(myModule);
  const store2 = new Dragonbinder(myModule);

  store1.commit('increment', 5);
  store2.commit('increment', 3);

  expect(store1.state.count).toEqual(6);
  expect(store2.state.count).toEqual(4);
});

test('Register nested modules with child nested module property', () => {
  let store = getNewStore();
  store.registerModule('my.module', {
    state: {hello: 'world'},
    mutations: {
      change(state) {
        state.hello = 'mundo';
      }
    },
    modules: {
      child: {
        state: {
          count: 1
        }
      }
    }
  });

  expect(store.init.modules).toEqual({
    'my.module': expect.any(Dragonbinder),
    'my.module.child': expect.any(Dragonbinder)
  });
  expect(store.state).toEqual(expect.objectContaining({
    'my.module': {
      hello: 'world'
    },
    'my.module.child': {
      count: 1
    }
  }));
});

test('Unregister nested modules with child nested module', () => {
  let store = getNewStore();
  store.registerModule('my.module', {
    state: {hello: 'world'},
    mutations: {
      change(state) {
        state.hello = 'mundo';
      }
    },
    modules: {
      child: {
        state: {
          count: 1
        }
      }
    }
  });

  expect(store.init.modules).toEqual({
    'my.module': expect.any(Dragonbinder),
    'my.module.child': expect.any(Dragonbinder)
  });
  expect(store.state).toEqual(expect.objectContaining({
    'my.module': {
      hello: 'world'
    },
    'my.module.child': {
      count: 1
    }
  }));

  store.unregisterModule('my.module');

  expect(store.init.modules).toEqual({});
  expect(store.state['my.module']).toBeUndefined();
  expect(store.state['my.module.child']).toBeUndefined();
});
