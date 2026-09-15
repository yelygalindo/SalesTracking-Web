import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from './ConfirmDialog'
describe('ConfirmDialog',()=>{it('confirma una acción destructiva',()=>{const confirm=vi.fn();render(<ConfirmDialog open title="Eliminar" description="No se puede deshacer" onConfirm={confirm} onCancel={()=>undefined}/>);fireEvent.click(screen.getByRole('button',{name:'Confirmar'}));expect(confirm).toHaveBeenCalledOnce()});it('no renderiza cuando está cerrado',()=>{render(<ConfirmDialog open={false} title="Eliminar" description="x" onConfirm={()=>undefined} onCancel={()=>undefined}/>);expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()})})
