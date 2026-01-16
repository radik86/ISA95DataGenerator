import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Divider,
} from '@mui/material';
import {
  AccountTree as GraphIcon,
  VpnKey as KeyIcon,
  Rule as RuleIcon,
  DataObject as DataIcon,
  AccountTreeOutlined as GraphOutlineIcon,
  Inventory as InventoryIcon,
  Assignment as ProcessIcon,
  Transform as TransformIcon,
  Assessment as AssessmentIcon,
  FactCheck as QualityIcon,
} from '@mui/icons-material';

const DRAWER_WIDTH = 240;

const menuItems = [
  { path: '/entities', label: 'Entity Browser', icon: <GraphIcon /> },
  { path: '/pk-rules', label: 'PK Rules', icon: <KeyIcon /> },
  { path: '/field-rules', label: 'Field Rules', icon: <RuleIcon /> },
  { path: '/generate', label: 'Generate Data', icon: <DataIcon /> },
  { path: '/graph-generate', label: 'Graph Generator', icon: <GraphOutlineIcon /> },
  { path: '/master-data', label: 'Master Data', icon: <InventoryIcon /> },
  { path: '/process-data', label: 'Process Data Generator', icon: <ProcessIcon /> },
  { path: '/data-migration', label: 'Data Migration', icon: <TransformIcon /> },
  { path: '/enumeration-evaluations', label: 'Enumeration Evaluations', icon: <AssessmentIcon /> },
  { path: '/quality-checks', label: 'Quality Checks', icon: <QualityIcon /> },
];

const Layout: React.FC = () => {
  const location = useLocation();

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap component="div">
            ISA-95 Test Data Generator
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Side Navigation */}
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {menuItems.map((item) => (
              <ListItem key={item.path} disablePadding>
                <ListItemButton
                  component={Link}
                  to={item.path}
                  selected={location.pathname === item.path}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Divider />
          <Box sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary">
              v1.0.0
            </Typography>
          </Box>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          overflow: 'auto',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Toolbar />
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 3 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
