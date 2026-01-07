<script lang="ts" module>
  import { mixin } from "../../../../release";

  class A {
    name = $state("Initial Name");

    static Update(instance: A, newName: string) {
      instance.name = newName;
    }
  }

  class B {
    description = $state("Initial Description");
  }

  class C {
    count = $state(0);
  }

  class Model extends mixin([A, B, C]) {}
</script>

<script lang="ts">
  const model = new Model();
</script>

<div>
  <h1>{model.name}</h1>
  <p>{model.description}</p>
  <p>Count: {model.count}</p>
</div>

<div>
  <button
    onclick={() => A.Update(model, model.name.split("").reverse().join(""))}
  >
    Reverse Name
  </button>
  <button onclick={() => model.count++}>Increment Count</button>
</div>
