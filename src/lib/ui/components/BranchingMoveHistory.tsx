import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Chess } from 'chess.js';
import type { ChessmeldMeldFormatCMFV001, ChildReference, PositionNode } from '@/lib/cmf';

interface BranchingMoveHistoryProps {
  /** The complete meld data */
  meld: ChessmeldMeldFormatCMFV001;
  /** Currently selected node FEN */
  currentFen: string;
  /** Callback when a node is clicked */
  onNodeClick: (fen: string) => void;
  /** Whether to show only strictly legal moves in main line */
  strictLegalOnly?: boolean;
  /** Custom CSS classes */
  className?: string;
}

interface MoveNode {
  fen: string;
  move: string;
  moveNumber: number;
  isMainline: boolean;
  depth: number;
  children: MoveNode[];
  legalPolicy?: string;
  comment?: string;
  label?: string;
}

interface BranchingMoveHistoryState {
  expandedNodes: Set<string>;
  showAllVariations: boolean;
}

export function BranchingMoveHistory({
  meld,
  currentFen,
  onNodeClick,
  strictLegalOnly = true,
  className = ''
}: BranchingMoveHistoryProps) {
  const [state, setState] = useState<BranchingMoveHistoryState>({
    expandedNodes: new Set([meld.rootNodeId]),
    showAllVariations: false
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const [focusedNodeFen, setFocusedNodeFen] = useState<string>(currentFen);

  // Update focused node when currentFen changes
  useEffect(() => {
    setFocusedNodeFen(currentFen);
  }, [currentFen]);

  // Build the move tree from the graph structure
  const moveTree = useMemo(() => {
    const visited = new Set<string>();
    const tree: MoveNode[] = [];

    function buildNode(fen: string, depth: number = 0, isMainline: boolean = true): MoveNode | null {
      if (visited.has(fen)) return null;
      visited.add(fen);

      const node = meld.nodes[fen];
      if (!node) return null;

      // Find the move that leads to this node
      let move = '';
      let legalPolicy = 'strict';
      let comment = '';
      let label = '';

      // Look for the move event that created this position
      const moveEvent = meld.events.find(event => 
        event.type === 'move' && 
        'fen' in event && 
        event.fen === fen
      );

      if (moveEvent && moveEvent.type === 'move') {
        move = moveEvent.san || `${moveEvent.from}-${moveEvent.to}`;
        legalPolicy = moveEvent.legalPolicy || 'strict';
        comment = moveEvent.comment || '';
      }

      // Get node metadata
      if (node.label) label = node.label;
      if (node.comment) comment = comment || node.comment;

      const moveNode: MoveNode = {
        fen,
        move,
        moveNumber: node.moveNumber || 0,
        isMainline,
        depth,
        children: [],
        legalPolicy,
        comment,
        label
      };

      // Build children
      if (node.children) {
        for (let i = 0; i < node.children.length; i++) {
          const child = node.children[i];
          const childIsMainline = isMainline && i === 0; // First child is mainline
          const childNode = buildNode(child.fen, depth + 1, childIsMainline);
          if (childNode) {
            moveNode.children.push(childNode);
          }
        }
      }

      return moveNode;
    }

    // Start from root
    const rootNode = buildNode(meld.rootNodeId, 0, true);
    return rootNode ? [rootNode] : [];
  }, [meld]);

  // Filter moves based on legal policy
  const filteredTree = useMemo(() => {
    if (!strictLegalOnly) return moveTree;

    function filterNode(node: MoveNode): MoveNode | null {
      // Keep the node if it's strictly legal or if it's the root
      if (node.moveNumber === 0 || node.legalPolicy === 'strict') {
        const filteredChildren = node.children
          .map(child => filterNode(child))
          .filter((child): child is MoveNode => child !== null);
        
        return {
          ...node,
          children: filteredChildren
        };
      }
      return null;
    }

    return moveTree.map(node => filterNode(node)).filter((node): node is MoveNode => node !== null);
  }, [moveTree, strictLegalOnly]);

  // Get all nodes in display order for keyboard navigation
  const getAllNodesInOrder = useMemo((): MoveNode[] => {
    const nodes: MoveNode[] = [];
    
    function collectNodes(node: MoveNode) {
      nodes.push(node);
      if (state.expandedNodes.has(node.fen) && (state.showAllVariations || node.isMainline)) {
        node.children.forEach(child => collectNodes(child));
      }
    }
    
    filteredTree.forEach(node => collectNodes(node));
    return nodes;
  }, [filteredTree, state.expandedNodes, state.showAllVariations]);

  // Navigation helper functions
  const navigateToPreviousNode = useCallback(() => {
    const currentIndex = getAllNodesInOrder.findIndex(node => node.fen === focusedNodeFen);
    if (currentIndex > 0) {
      setFocusedNodeFen(getAllNodesInOrder[currentIndex - 1].fen);
    }
  }, [getAllNodesInOrder, focusedNodeFen]);

  const navigateToNextNode = useCallback(() => {
    const currentIndex = getAllNodesInOrder.findIndex(node => node.fen === focusedNodeFen);
    if (currentIndex < getAllNodesInOrder.length - 1) {
      setFocusedNodeFen(getAllNodesInOrder[currentIndex + 1].fen);
    }
  }, [getAllNodesInOrder, focusedNodeFen]);

  const navigateToParentNode = useCallback(() => {
    const currentNode = meld.nodes[focusedNodeFen];
    if (currentNode?.parents && currentNode.parents.length > 0) {
      setFocusedNodeFen(currentNode.parents[0].fen);
    }
  }, [meld.nodes, focusedNodeFen]);

  const navigateToFirstChildNode = useCallback(() => {
    const currentNode = meld.nodes[focusedNodeFen];
    if (currentNode?.children && currentNode.children.length > 0) {
      setFocusedNodeFen(currentNode.children[0].fen);
    }
  }, [meld.nodes, focusedNodeFen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement)) return;

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          navigateToPreviousNode();
          break;
        case 'ArrowDown':
          event.preventDefault();
          navigateToNextNode();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          navigateToParentNode();
          break;
        case 'ArrowRight':
          event.preventDefault();
          navigateToFirstChildNode();
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          onNodeClick(focusedNodeFen);
          break;
        case 'Escape':
          event.preventDefault();
          setFocusedNodeFen(meld.rootNodeId);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [focusedNodeFen, onNodeClick, meld.rootNodeId, navigateToPreviousNode, navigateToNextNode, navigateToParentNode, navigateToFirstChildNode]);

  // Toggle node expansion
  const toggleExpansion = (fen: string) => {
    setState(prev => ({
      ...prev,
      expandedNodes: prev.expandedNodes.has(fen)
        ? new Set([...prev.expandedNodes].filter(f => f !== fen))
        : new Set([...prev.expandedNodes, fen])
    }));
  };

  // Toggle show all variations
  const toggleShowAllVariations = () => {
    setState(prev => ({
      ...prev,
      showAllVariations: !prev.showAllVariations
    }));
  };

  // Render a single move node
  const renderMoveNode = (node: MoveNode, index: number = 0) => {
    const isExpanded = state.expandedNodes.has(node.fen);
    const isSelected = node.fen === currentFen;
    const isFocused = node.fen === focusedNodeFen;
    const hasChildren = node.children.length > 0;
    const isVariation = !node.isMainline;
    const showChildren = isExpanded && (state.showAllVariations || node.isMainline);

    // Calculate move number display
    const displayMoveNumber = node.moveNumber > 0 ? Math.ceil(node.moveNumber / 2) : 0;
    const isWhiteMove = node.moveNumber % 2 === 1;
    const isBlackMove = node.moveNumber % 2 === 0 && node.moveNumber > 0;

    return (
      <div key={node.fen} className="move-node">
        {/* Move number and move */}
        <div
          className={`move-item ${isSelected ? 'selected' : ''} ${isFocused ? 'focused' : ''} ${isVariation ? 'variation' : 'mainline'}`}
          style={{ marginLeft: `${node.depth * 20}px` }}
          onClick={() => onNodeClick(node.fen)}
          onFocus={() => setFocusedNodeFen(node.fen)}
          tabIndex={0}
          role="button"
          aria-label={`Move ${node.move}${node.comment ? ` - ${node.comment}` : ''}${hasChildren ? ` - ${isExpanded ? 'expanded' : 'collapsed'}` : ''}`}
          aria-expanded={hasChildren ? isExpanded : undefined}
        >
          {/* Move number for white moves */}
          {isWhiteMove && (
            <span className="move-number">{displayMoveNumber}.</span>
          )}
          
          {/* Move notation */}
          <span 
            className={`move-notation ${isWhiteMove ? 'white-move' : 'black-move'} ${isSelected ? 'selected' : ''}`}
          >
            {node.move}
          </span>

          {/* Expansion indicator */}
          {hasChildren && (
            <button
              className="expand-button"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpansion(node.fen);
              }}
              aria-label={isExpanded ? 'Collapse variations' : 'Expand variations'}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}

          {/* Comment or label */}
          {(node.comment || node.label) && (
            <span className="move-comment">
              {node.comment || node.label}
            </span>
          )}

          {/* Legal policy indicator */}
          {node.legalPolicy !== 'strict' && (
            <span className="legal-policy-indicator" title={`Legal policy: ${node.legalPolicy}`}>
              {node.legalPolicy === 'pieceLegal' ? '⚡' : '🔓'}
            </span>
          )}
        </div>

        {/* Children (variations) */}
        {showChildren && node.children.map((child, childIndex) => 
          renderMoveNode(child, childIndex)
        )}
      </div>
    );
  };

  // Render initial position
  const renderInitialPosition = () => {
    const isSelected = meld.rootNodeId === currentFen;
    const isFocused = meld.rootNodeId === focusedNodeFen;
    return (
      <div
        className={`move-item initial-position ${isSelected ? 'selected' : ''} ${isFocused ? 'focused' : ''}`}
        onClick={() => onNodeClick(meld.rootNodeId)}
        onFocus={() => setFocusedNodeFen(meld.rootNodeId)}
        tabIndex={0}
        role="button"
        aria-label="Initial position"
      >
        <span className="move-number">0.</span>
        <span className="move-notation initial">Initial Position</span>
      </div>
    );
  };

  return (
    <div 
      ref={containerRef}
      className={`branching-move-history ${className}`}
      role="tree"
      aria-label="Chess move history with variations"
    >
      {/* Header */}
      <div className="move-history-header">
        <h3>Move History</h3>
        <div className="controls">
          <button
            className={`control-button ${state.showAllVariations ? 'active' : ''}`}
            onClick={toggleShowAllVariations}
            title="Show all variations"
          >
            All Variations
          </button>
          {strictLegalOnly && (
            <span className="legal-policy-info" title="Showing only strictly legal moves">
              Strict Legal Only
            </span>
          )}
        </div>
      </div>

      {/* Move list */}
      <div className="move-list">
        {renderInitialPosition()}
        {filteredTree.map((node, index) => renderMoveNode(node, index))}
      </div>

      {/* Legend */}
      <div className="move-history-legend">
        <div className="legend-item">
          <span className="legend-symbol">⚡</span>
          <span>Piece-legal move</span>
        </div>
        <div className="legend-item">
          <span className="legend-symbol">🔓</span>
          <span>Free move</span>
        </div>
        <div className="legend-item">
          <span className="legend-symbol">▶</span>
          <span>Click to expand variations</span>
        </div>
        <div className="legend-item">
          <span className="legend-symbol">⌨️</span>
          <span>Use arrow keys to navigate</span>
        </div>
      </div>
    </div>
  );
}
