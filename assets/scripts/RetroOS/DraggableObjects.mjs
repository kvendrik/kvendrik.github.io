export class DraggableObjects {
  constructor(objectSelector, wrapper) {
    this.wrapper = wrapper;
    this.options = {
      Selectors: {
        object: objectSelector,
        dragHandle: '[data-drag-handle]',
      },
      Classes: {
        topObject: 'draggable-object--top-object',
      },
    };

    this.dragState = {
      mouseDown: false,
      startPosition: {x: 0, y: 0},
      dragging: false,
      node: null,
      cursorOffset: {x: 0, y: 0},
    };
  }

  bindEvents() {
    const {wrapper} = this;
    wrapper.addEventListener('mousedown', this.handleMousedown.bind(this));
    wrapper.addEventListener('mousemove', this.handleMousemove.bind(this));
    wrapper.addEventListener('mouseup', this.handleMouseup.bind(this));
  }

  handleMousedown({target, clientX, clientY}) {
    const {options: {Selectors}} = this;
    const closestObject = target.closest(Selectors.object);

    if (closestObject) {
      this.moveObjectToTop(closestObject);
    }

    if (!target.closest(Selectors.dragHandle)) {
      return;
    }

    const {left, top} = target.getBoundingClientRect();

    this.dragState = {
      mouseDown: true,
      startPosition: {x: clientX, y: clientY},
      dragging: false,
      node: closestObject,
      cursorOffset: {x: clientX - left, y: clientY - top}
    };
  }

  handleMousemove({clientX, clientY}) {
    const {
      mouseDown,
      startPosition,
    } = this.dragState;

    if (!mouseDown) return;

    const cursorTraveledX = Math.abs(clientX - startPosition.x);
    const cursorTraveledY = Math.abs(clientY - startPosition.y);

    // only start dragging when cursor moves more than 20px
    if (cursorTraveledX > 20 || cursorTraveledY > 20) {
      this.dragState.dragging = true;
    }

    const {
      dragging, 
      node, 
      cursorOffset
    } = this.dragState;

    if (!dragging) return;

    const x = clientX - cursorOffset.x;
    const y = clientY - cursorOffset.y;

    node.setAttribute(
      'style',
      `transform: translate(${x}px, ${y}px)`,
    );
  }

  handleMouseup() {
    this.dragState.mouseDown = false;
    this.dragState.dragging = false;
  }

  moveObjectToTop(topObject) {
    const {options: {Selectors, Classes}} = this;
    const draggableObjects = this.wrapper.querySelectorAll(Selectors.object);

    for (const objectNode of draggableObjects) {
      objectNode.classList.remove(Classes.topObject);
    }

    topObject.classList.add(Classes.topObject);
  }
}
