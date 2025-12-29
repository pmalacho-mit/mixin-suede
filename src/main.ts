import "./style.css";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
  </div>
`;

class A extends (Array<number>() as any as new () => [0, 1, 2]) {
  x() {
    const y = super[1];
  }
}
