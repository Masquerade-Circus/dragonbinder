[![npm version](https://img.shields.io/npm/v/dragonbinder.svg?style=flat)](https://npmjs.org/package/dragonbinder "View this project on npm")
![](https://img.shields.io/bundlephobia/min/dragonbinder.svg?style=flat)
![](https://img.shields.io/bundlephobia/minzip/dragonbinder.svg?style=flat)

[![Build Status](https://travis-ci.org/Masquerade-Circus/dragonbinder.svg?branch=master)](https://travis-ci.org/Masquerade-Circus/dragonbinder)
[![Dependencies](https://img.shields.io/david/masquerade-circus/dragonbinder.svg?style=flat)](https://david-dm.org/masquerade-circus/dragonbinder)
![](https://img.shields.io/github/issues/masquerade-circus/dragonbinder.svg)
![](https://img.shields.io/snyk/vulnerabilities/npm/dragonbinder.svg)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/521f72fc6d61426783692b62d64a3643)](https://www.codacy.com/app/Masquerade-Circus/dragonbinder?utm_source=github.com&utm_medium=referral&utm_content=Masquerade-Circus/dragonbinder&utm_campaign=Badge_Grade)
[![Maintainability](https://api.codeclimate.com/v1/badges/c1263dd7fb4f90194625/maintainability)](https://codeclimate.com/github/Masquerade-Circus/dragonbinder/maintainability)
[![Coverage Status](https://coveralls.io/repos/github/Masquerade-Circus/dragonbinder/badge.svg?branch=master)](https://coveralls.io/github/Masquerade-Circus/dragonbinder?branch=master)
[![License](https://img.shields.io/github/license/masquerade-circus/dragonbinder.svg)](https://github.com/masquerade-circus/dragonbinder/blob/master/LICENSE)

# Dragonbinder

1kb progressive state management library inspired by Vuex.

## Features

- [x] Immutable state.
- [x] Getters.
- [x] Mutations.
- [x] Actions.
- [x] Event listeners.
- [x] Nested modules.
- [x] Plugin system.

## Table of Contents

- [Dragonbinder](#dragonbinder)
  - [Features](#features)
  - [Table of Contents](#table-of-contents)
  - [Install](#install)
  - [Use](#use)
    - [State](#state)
    - [Getters](#getters)
    - [Mutations](#mutations)
    - [Actions](#actions)
    - [Events](#events)
      - [Event types](#event-types)
    - [Nested modules](#nested-modules)
      - [Local and root state](#local-and-root-state)
    - [Plugin system](#plugin-system)
      - [Using plugins](#using-plugins)
      - [Creating plugins](#creating-plugins)
  - [Development, Build and Tests](#development-build-and-tests)
  - [Contributing](#contributing)
  - [Legal](#legal)

## Install

You can get this library as a [Node.js](https://nodejs.org/en/) module available through the [npm registry](https://www.npmjs.com/):

```bash
// With npm
$ npm install dragonbinder
// With yarn
$ yarn add dragonbinder
```

Or you can use it standalone in the browser with: 
`<script src="https://cdn.jsdelivr.net/npm/dragonbinder"></script>`

## Use

```javascript
const Dragonbinder = require('dragonbinder');

const store = new Dragonbinder({
  state: {
    count: 0
  },
  mutations: {
    increment(state) {
      state.count++
    }
  }
});

store.commit('increment');
console.log(store.state.count) // -> 1
```

### State

**Dragonbinder** use Proxies to create a state as a "single source of truth" which cannot be changed unless you commit a mutation. 
This means that you cannot delete, modify or add a property directly. This allow us to keep track of all changes we made to the state.

If you don't provide an initial state by the `state` property **Dragonbinder** will create one.

```javascript
const store = new Dragonbinder({
  state: {
    count: 0
  },
  mutations: {
    addProperty(state, value) {
      state.hello = 'world';
    },
    modifyProperty(state) {
      state.count++
    },
    removeProperty(state) {
      delete state.count;
    }
  }
});

// This will throw errors
store.state.hello = 'world';
store.state.count++;
delete state.count;

// This will work as expected
store.commit('addProperty');
store.commit('modifyProperty');
store.commit('removeProperty');
```

Also, if you want to avoid singletons to reuse your initial store definition, you can declare its state as a factory function.

```javascript
const myStoreDefinition = {
  state(){
    return {
      count: 1
    }
  },
  mutations: {
    increment(state, payload) {
      state.count = state.count + payload;
    }
  }
};

const store1 = new Dragonbinder(myStoreDefinition);
const store2 = new Dragonbinder(myStoreDefinition);

store1.commit('increment', 5);
store2.commit('increment', 3);

console.log(store1.state.count); // -> 6
console.log(store2.state.count); // -> 4
```

### Getters

As with Vue, with **Dragonbinder** you can create getters to create computed properties based on the state. 
This getters will receive the state as first argument and all other getters as second.

```javascript
const store = new Dragonbinder({
  state: {
    todos: [
      {
        content: 'First',
        completed: false
      }, 
      {
        content: 'Second',
        completed: true
      }
    ]
  },
  getters: {
    completed(state){
      return state.todos.filter(item => item.completed);
    },
    completedCount(state, getters){
      return getters.completed.length;
    }
  }
});

console.log(store.getters.completed); // -> { content: 'Second', completed: true }
console.log(store.getters.completedCount); // -> 1
```

### Mutations

Mutations are the only way to change the state and you must consider the next points when designing mutations.

- Following the Vuex pattern, mutations must be synchronous.
- Unlike many other libraries you can pass any number of arguments to a mutation.
- With **Dragonbinder** the state is deep frozen using `Object.freeze` to prevent direct changes. So, when you are changing the state by using a mutation, you can add, modify or delete only first level properties, second level properties will be read only.

```javascript
const store = new Dragonbinder({
  state: {
    hello: {
      name: 'John Doe'
    }
  },
  mutations: {
    changeNameError(state, payload){
      state.hello.name = payload;
    },
    changeNameOk(state, payload){
      state.hello = {...state.hello, name: payload};
    },
    changeNameTo(state, ...args){
      state.hello = {...state.hello, name: args.join(' ')};
    }
  }
});

// This will throw an assign to read only property error
store.commit('changeNameError', 'Jane Doe');

// This will work as expected
store.commit('changeNameOk', 'Jane Doe');

// You can pass any number of arguments as payload
store.commit('changeNameTo', 'Jane', 'Doe');
```

### Actions

If you need to handle async functions you must use actions. And actions will always return a promise as result of calling them. 

```javascript
const store = new Dragonbinder({
  state: {
    count: 0
  },
  mutations: {
    increment(state) {
      state.count++
    }
  },
  actions: {
    increment(state){
      return new Promise((resolve) => {
        setTimeout(() => {
          store.commit('increment');
          resolve();
        }, 1000);
      })
    }
  }
});

store.dispatch('increment').then(() => console.log(store.state.count)); // -> 1 after one second
```

### Events

You can register/unregister callbacks to events.

```javascript
const store = new Dragonbinder({
  state: {
    count: 0
  },
  mutations: {
    increment(state) {
      state.count++
    }
  }
});

// Add a named listener
let namedListener = (store, prop, newVal, oldVal) => console.log(`The property ${prop} was changed from ${oldVal} to ${newVal}`);
store.on('set', namedListener);

// Add an anonymous listener
let removeAnonymousListener = store.on('set', () => console.log('Anonymous listener triggered'));

// Committing increment will trigger the listener
store.commit('increment');
// $ The property count was changed from 0 to 1
// $ Anonymous listener triggered

// Remove a named listener 
store.off('set', namedListener);

// Remove an anonyous listener 
removeAnonymousListener();

// Committing increment will do nothing as the listeners are already removed
store.commit('increment'); 
```

#### Event types

All events receive the store instance as the first argument.

| Event name       | Its called when                                                                          | Arguments received by place                                                    |
| ---------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| addlistener      | An event listener is added                                                               | Event name \| Listener added                                                   |
| removelistener   | An event listener is removed                                                             | Event name \| Listener removed                                                 |
| set              | A property of the state is added or modified, also triggered when a module is registered | Property name \| New value \| Old value                                        |
| delete           | A property of the state is deleted, also triggered when a module is unregistered         | Property name \| Old value                                                     |
| beforecommit     | Commit method called and before apply the mutation                                       | Mutation name \| (...) Arguments passed to the mutation                        |
| commit           | Commit method called and after apply the mutation                                        | Mutation name \| (...) Arguments passed to the mutation                        |
| beforedispatch   | Dispatch method called and before apply the action                                       | Action name \| (...) Arguments passed to the action                            |
| dispatch         | Dispatch method called and after apply the action                                        | Action name \| (...) Arguments passed to the action                            |
| getter           | A getter is called                                                                       | Getter name \| Value of the getter                                             |
| plugin           | A plugin is added                                                                        | Plugin added \| (...) Options passed to the plugin                             |
| registerModule   | A module is registered                                                                   | Namespace registered \| Module definition \| Store created with the definition |
| unregisterModule | A module is unregistered                                                                 | Namespace unregistered \| Store created with the definition                    |

### Nested modules

Like Vuex, **Dragonbinder** allows you to divide your store into modules and each module can contain its own store definition including more nested modules.

```javascript
const moduleA = {
  state: { ... },
  mutations: { ... },
  actions: { ... },
  getters: { ... }
}

const moduleB = {
  state: { ... },
  mutations: { ... },
  actions: { ... },
  getters: { ... }
  modules: {
    a: moduleA
  }
}

const store = new Dragonbinder({
  modules: {
    b: moduleB
  }
});

console.log(store.state.b) // -> `moduleB`'s state
console.log(store.state['b.a']) // -> `moduleA`'s state
```

Also, after the store is created you can register/unregister modules with the `registerModule` and `unregisterModule` methods.

Consider that when you unregister a module, only its initial nested modules will be unregistered with it.

```javascript
const moduleA = {
  state: { ... },
  mutations: { ... },
  actions: { ... },
  getters: { ... }
}

const moduleB = {
  state: { ... },
  mutations: { ... },
  actions: { ... },
  getters: { ... },
  modules: {
    a: moduleA
  }
}

const moduleC = {
  state: { ... },
  mutations: { ... },
  actions: { ... },
  getters: { ... }
}

const store = new Dragonbinder();
store.registerModule('b', moduleB);
store.registerModule('b.c', moduleC);

console.log(store.state.b) // -> `moduleB`'s state
console.log(store.state['b.a']) // -> `moduleA`'s state
console.log(store.state['b.c']) // -> `moduleC`'s state

store.unregisterModule('b'); 

console.log(store.state.b) // -> undefined
console.log(store.state['b.a']) // -> undefined
console.log(store.state['b.c']) // -> `moduleC`'s state
```

#### Local and root state

Each module will behave like any other store, but, unlike Vuex, all **Dragonbinder** modules are namespaced by design. There is no option to add root mutations, actions or getters with a module. So, when you call a module mutation, action or getter, you need to supply its full namespace.

The first argument for mutations and getters will continue to be the local state, and with actions the first argument will be the local context/store.

Getters will get the root state and root getters as the third and fourth arguments. 

Actions will access the root context by the `rootStore` property of the local context.

```javascript
const moduleA = {
  state: {
    hello: 'world'
  },
  mutations: {
    sayHello(state, payload){
      state.hello = payload;
    }
  },
  actions:{
    change(store, payload){
      store.commit('sayHello', payload);
      store.rootStore.commit('increment');
    }
  },
  getters: {
    hello(state, getters, rootState, rootGetters){
      return `You have said hello ${rootState.count} times to ${state.hello}`;
    }
  }
};

const store = new Dragonbinder({
  state: {
    count: 0
  },
  mutations: {
    increment(state){
      state.count++;
    }
  },
  modules: {
    a: moduleA
  }
});

store.dispatch('a.change', 'John Doe');
console.log(store.getters['a.hello']); // -> You have said hello 1 times to John Doe
console.log(store.state.count) // -> 1
console.log(store.state.a.hello) // -> John Doe
```

### Plugin system

**Dragonbinder** comes with a simple but powerfull plugin system.
You can extend its core functionality or change it completely by making use of plugins. 

#### Using plugins

```javascript
let store = new Dragonbinder();
store.use(myPlugin, ...options);
```

#### Creating plugins

A **Dragonbinder** plugin is a module that exports a single function that will be called
with the store instance as first argument and optionally with the passed options if any.

```javascript
const Dragonbinder = require('dragonbinder');
const myPlugin = (store, ...options) => {

  Dragonbinder.myGlobalMethod = function() {
    // Awesome code here
  };
  
  Dragonbinder.fn.myPrototypeMethod = function() {
    // Awesome code here
  };

  store.myLocalMethod = function() {
    // Awesome code here
  };
};
```

## Development, Build and Tests

Use `yarn dev` to watch and compile the library on every change to it. 

Use `yarn build` to build the library. 

Use `yarn test` to run tests only once.

Use `yarn dev:test` to run the tests watching changes to library and tests.

Use `yarn dev:test:nyc` to run the tests watching changes and get the test coverage at last.

Use `yarn docs` to build the documentation. 

Use `yarn docs:watch` to watch and rebuild the documentation on every change to the library or the md files.

Use `yarn docs:serve` to see the generated documentation locally. 

## Contributing

- Use prettify and eslint to lint your code.
- Add tests for any new or changed functionality.
- Update the readme with an example if you add or change any functionality.

## Legal

Author: [Masquerade Circus](http://masquerade-circus.net). License [Apache-2.0](https://opensource.org/licenses/Apache-2.0)
