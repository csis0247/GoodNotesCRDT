// Seems Javascript does not have assert natively.
// Check if browser console has one, if not, fall back to simple assert.
function assert(condition, message) {
  console.log(message);
  if (console.assert) {
    console.assert(condition, message);
  } else {
    if (condition) {
      console.log("Assertion success");
    } else {
      console.log("Assertion failed");
    }
  }
}

// An element in one of the sets of a DataSet, with timestamp.
class Element {
  constructor(value, timestamp=Date.now()) {
    this.value = value;
    this.timestamp = timestamp;
  }
  get_value() {
    return this.value;
  }
  get_timestamp() {
    return this.timestamp;
  }
  equals(another_element) {
    return this.value === another_element.get_value();
  }
}

// "Extends" Javascript's native Set's functions.
class CustomSet {
  constructor(data = []) {
    this.data = data;
  }

  get(value) {
    // Not enough time to make it faster.
    for(let i=0; i < this.data.length; i++) {
      if(this.data[i].get_value() === value) {
        return this.data[i];
      }
    }
  }

  has(value) {
    for(let i=0; i < this.data.length; i++) {
      if(this.data[i].get_value() === value) {
        return true;
      }
    }
    return false;
  }

  add(element) {
    if(!this.has(element.get_value())) {
      this.data.push(element);
    } else {
      this.get(element.get_value()).timestamp = element.timestamp;
    }
  }

  // Basic Set operations modified from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set
  union(datasetB) {
    let union = new CustomSet(this.data);
    for (let elem of datasetB.data) {
      union.add(elem);
    }
    return union;
  }

  isSupersetOf(subset) {
    for (let elem of subset.data) {
      if (!this.has(elem)) {
        return false;
      }
    }
    return true;
  }
}

// A Payload, as Wikipedia calls it.
class DataSet {
  constructor(setAdd=new CustomSet(), setRemove=new CustomSet()) {
    this.setAdd = setAdd;
    this.setRemove = setRemove;
  }

  lookup(item, time=Date.now()) {
    return this.setAdd.has(item) && (!this.setRemove.has(item) || (this.setRemove.has(item)?(this.setRemove.get(item).get_timestamp() < this.setAdd.get(item).get_timestamp()):false));
  }
  
  add(item, time=Date.now()) {
    let element = new Element(item, time);
    this.setAdd.add(element);
  }
  
  remove(item, time=Date.now()) {
    let element = new Element(item, time);
    this.setRemove.add(element);
  }
}

function comparison(dataSetA, dataSetB) {
  return dataSetB.setAdd.isSupersetOf(dataSetA.setAdd) && dataSetB.setRemove.isSuperset(dataSetA.setRemove);
}

function merge(dataSetA, dataSetB) {
  let dataSetC = new DataSet();
  // If timestamp equals, bias to remove.
  dataSetC.setAdd = dataSetA.setAdd.union(dataSetB.setAdd);
  dataSetC.setRemove = dataSetA.setRemove.union(dataSetB.setRemove);
  return dataSetC;
}



// Test cases

let dataSetA = new DataSet();
frozen_time = Date.now(); // Fix a timestamp to test concurrency.

dataSetA.add("a");
dataSetA.add("b");
dataSetA.add("c");
dataSetA.add("d");
dataSetA.add("e");
assert(dataSetA.lookup("a"), "Basic insertion.");
assert(dataSetA.lookup("e"), "Basic insertion.");

dataSetA.remove("c");
dataSetA.remove("d");
dataSetA.remove("e");
assert(dataSetA.lookup("a"), "Basic removal.");
assert(!dataSetA.lookup("c"), "Basic removal.");
assert(!dataSetA.lookup("e"), "Basic removal.");

dataSetA.add("d");
assert(dataSetA.lookup("a"), "Re-insert after removal.");
assert(dataSetA.lookup("d"), "Re-insert after removal.");

dataSetA.add("f");
assert(dataSetA.lookup("a"), "Basic insertion, after some operations.");
assert(dataSetA.lookup("f"), "Basic insertion, after some operations.");

dataSetA.add("g", frozen_time);
dataSetA.remove("g", frozen_time);
assert(!dataSetA.lookup("g"), "Add and remove at the same time.");

frozen_time = Date.now();
dataSetA.remove("h", frozen_time);
dataSetA.add("h", frozen_time);
assert(!dataSetA.lookup("h"), "Remove and add at the same time.");

dataSetA.add("i", frozen_time);
let dataSetB = new DataSet();
dataSetB.add("i", frozen_time);
dataSetB.add("a");
dataSetB.add("b");
dataSetB.add("k");
dataSetB.add("l");

let dataSetC = merge(dataSetA, dataSetB);
assert(dataSetC.lookup("a"), "Verify DataSet content after merge. 'a'");
assert(dataSetC.lookup("b"), "Verify DataSet content after merge. 'b'");
assert(dataSetC.lookup("d"), "Verify DataSet content after merge. 'd'");
assert(dataSetC.lookup("f"), "Verify DataSet content after merge. 'f'");
assert(dataSetC.lookup("i"), "Verify DataSet content after merge. 'i'");
assert(dataSetC.lookup("k"), "Verify DataSet content after merge. 'k'");
assert(dataSetC.lookup("l"), "Verify DataSet content after merge. 'l'");

assert(!dataSetC.lookup("c"), "Verify DataSet content after merge. '!c'");
assert(!dataSetC.lookup("e"), "Verify DataSet content after merge. '!e'");
assert(!dataSetC.lookup("g"), "Verify DataSet content after merge. '!g'");
assert(!dataSetC.lookup("h"), "Verify DataSet content after merge. '!h'");
assert(!dataSetC.lookup("m"), "Verify DataSet content after merge. '!m'");
