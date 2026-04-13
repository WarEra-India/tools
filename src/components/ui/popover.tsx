import * as React from "react"
import { cn } from "@/lib/utils"

interface PopoverContextValue {
  open: boolean
  onOpenChange: (open: boolean) => void
  containerRef: React.RefObject<HTMLDivElement | null>
}

const PopoverContext = React.createContext<PopoverContextValue | undefined>(undefined)

export function Popover({ 
  children, 
  open: controlledOpen, 
  onOpenChange: setControlledOpen 
}: { 
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const open = controlledOpen ?? uncontrolledOpen
  const onOpenChange = setControlledOpen ?? setUncontrolledOpen

  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onOpenChange(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open, onOpenChange])

  return (
    <PopoverContext.Provider value={{ open, onOpenChange, containerRef }}>
      <div ref={containerRef} className="relative inline-block">
        {children}
      </div>
    </PopoverContext.Provider>
  )
}

export function PopoverTrigger({ 
  children, 
  asChild 
}: { 
  children: React.ReactNode; 
  asChild?: boolean;
}) {
  const context = React.useContext(PopoverContext)
  if (!context) throw new Error("PopoverTrigger must be used within a Popover")

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    context.onOpenChange(!context.open)
  }

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<any>
    return React.cloneElement(child, {
      onClick: (e: React.MouseEvent) => {
        handleClick(e)
        child.props.onClick?.(e)
      }
    })
  }

  return (
    <div onClick={handleClick} className="cursor-pointer">
      {children}
    </div>
  )
}

export function PopoverContent({ 
  children, 
  className,
  align = "center" 
}: { 
  children: React.ReactNode; 
  className?: string;
  align?: "start" | "center" | "end"
}) {
  const context = React.useContext(PopoverContext)
  const contentRef = React.useRef<HTMLDivElement>(null)
  
  // Default to bottom to avoid initial flash in wrong position if measurable fast
  const [positionProps, setPositionProps] = React.useState({ side: 'bottom' as 'top' | 'bottom' | 'left' | 'right' })

  // Use layout effect to measure before paint
  React.useLayoutEffect(() => {
    if (!context || !context.open || !context.containerRef.current || !contentRef.current) return;

    const triggerRect = context.containerRef.current.getBoundingClientRect();
    const contentRect = contentRef.current.getBoundingClientRect();
    const padding = 12; // mb-3/mt-3 spacing equivalent

    const spaceBottom = window.innerHeight - triggerRect.bottom;
    const spaceTop = triggerRect.top;
    const spaceRight = window.innerWidth - triggerRect.right;
    const spaceLeft = triggerRect.left;

    const spaces = [
      { side: 'bottom', space: spaceBottom, required: contentRect.height + padding },
      { side: 'top', space: spaceTop, required: contentRect.height + padding },
      { side: 'right', space: spaceRight, required: contentRect.width + padding },
      { side: 'left', space: spaceLeft, required: contentRect.width + padding },
    ] as const;

    // Pick first side that fits in order of preference: bottom, right, left, top
    const fittingSpaces = spaces.filter(s => s.space >= s.required);
    let bestSide: 'top' | 'bottom' | 'left' | 'right' = 'bottom';
    
    if (fittingSpaces.length > 0) {
      // Prioritize bottom, then right, left, top
      if (fittingSpaces.find(s => s.side === 'bottom')) bestSide = 'bottom';
      else if (fittingSpaces.find(s => s.side === 'right')) bestSide = 'right';
      else if (fittingSpaces.find(s => s.side === 'left')) bestSide = 'left';
      else bestSide = 'top';
    } else {
      // If nothing fits perfectly, just pick whatever has absolute max space
      bestSide = spaces.reduce((prev, curr) => (curr.space > prev.space ? curr : prev)).side;
    }

    setPositionProps({ side: bestSide });
  }, [context?.open]);

  if (!context || !context.open) return null

  const getSideClasses = () => {
    switch (positionProps.side) {
      case 'bottom': return 'top-full mt-3 origin-top';
      case 'top': return 'bottom-full mb-3 origin-bottom';
      case 'left': return 'right-full mr-3 top-1/2 -translate-y-1/2 origin-right';
      case 'right': return 'left-full ml-3 top-1/2 -translate-y-1/2 origin-left';
      default: return 'top-full mt-3 origin-top';
    }
  }

  const getAlignClasses = () => {
    if (positionProps.side === 'left' || positionProps.side === 'right') return '';
    switch (align) {
      case 'start': return 'left-0';
      case 'center': return 'left-1/2 -translate-x-1/2';
      case 'end': return 'right-0';
    }
    return '';
  }

  return (
    <div
      ref={contentRef}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "absolute z-[60] w-72 rounded-2xl border border-zinc-800 bg-zinc-900 p-2 shadow-2xl animate-in fade-in zoom-in duration-200",
        getSideClasses(),
        getAlignClasses(),
        className
      )}
    >
      {children}
    </div>
  )
}
