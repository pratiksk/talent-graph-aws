export interface TalentNode {
  id: string;
  type: string;   // Person | Skill | Project | Client | Team
  name: string;
  properties: Record<string, unknown>;
}

export interface TalentEdge {
  id: string;
  source: string;
  target: string;
  type: string;   // HAS_SKILL | WORKED_ON | MEMBER_OF | FOR_CLIENT | USED_SKILL | DELIVERED
}

export interface GraphData {
  nodes: TalentNode[];
  edges: TalentEdge[];
}

export interface QueryResult {
  answer: string;
  cypher: string;
  traversed_node_ids: string[];
}

export interface ChatEntry {
  question: string;
  answer: string | null;  // null = in-flight
  cypher: string;
}
